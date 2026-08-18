import { DeepgramClient } from '@deepgram/sdk'
import { EventEmitter } from 'events'
import { randomUUID } from 'crypto'

export interface TranscriptionEvent {
  id: string
  speaker: string
  text: string
  timestamp: number
  isFinal: boolean
}

export class DeepgramSTTService extends EventEmitter {
  private deepgram: DeepgramClient
  private connection: any = null
  private currentUtterance: string = ''
  private currentSpeaker: string = 'Speaker 0'
  private utteranceStartTime: number = 0

  constructor(apiKey: string) {
    super()
    this.deepgram = new DeepgramClient(apiKey)
  }

  async start() {
    // Configure Deepgram streaming
    this.connection = this.deepgram.listen.live({
      model: 'nova-2',
      language: 'en-US',
      smart_format: true,
      punctuate: true,
      diarize: true, // Enable speaker diarization
      interim_results: true,
      utterance_end_ms: 1000,
      vad_events: true,
    })

    // Handle connection open
    this.connection.on('open', () => {
      console.log('🎤 Deepgram connection opened')
      this.emit('ready')
    })

    // Handle transcription results
    this.connection.on('transcript', (data: any) => {
      const result = data.channel?.alternatives?.[0]
      if (!result || !result.transcript) return

      const transcript = result.transcript.trim()
      if (!transcript) return

      // Get speaker from first word (Deepgram provides speaker per word)
      const speaker = data.channel?.alternatives?.[0]?.words?.[0]?.speaker
      const speakerId = speaker !== undefined ? `Speaker ${speaker}` : this.currentSpeaker

      // Check if this is a new speaker
      const speakerChanged = speakerId !== this.currentSpeaker

      // Handle utterance end or speaker change
      if (data.is_final || speakerChanged) {
        if (this.currentUtterance && speakerChanged) {
          // Emit the previous speaker's utterance
          this.emitUtterance(this.currentSpeaker, this.currentUtterance, true)
          this.currentUtterance = ''
        }

        if (speakerChanged) {
          this.currentSpeaker = speakerId
          this.utteranceStartTime = Date.now()
        }

        this.currentUtterance += (this.currentUtterance ? ' ' : '') + transcript

        if (data.is_final && data.speech_final) {
          // Emit final utterance
          this.emitUtterance(this.currentSpeaker, this.currentUtterance, true)
          this.currentUtterance = ''
        }
      } else {
        // Interim result - emit for real-time display
        const fullText = this.currentUtterance + (this.currentUtterance ? ' ' : '') + transcript
        this.emitUtterance(this.currentSpeaker, fullText, false)
      }
    })

    // Handle errors
    this.connection.on('error', (error: any) => {
      console.error('❌ Deepgram error:', error)
      this.emit('error', error)
    })

    // Handle connection close
    this.connection.on('close', () => {
      console.log('🛑 Deepgram connection closed')
      this.emit('close')
    })

    // Handle utterance end events
    this.connection.on('utteranceEnd', () => {
      if (this.currentUtterance) {
        this.emitUtterance(this.currentSpeaker, this.currentUtterance, true)
        this.currentUtterance = ''
      }
    })
  }

  private emitUtterance(speaker: string, text: string, isFinal: boolean) {
    const event: TranscriptionEvent = {
      id: randomUUID(),
      speaker,
      text,
      timestamp: this.utteranceStartTime || Date.now(),
      isFinal,
    }
    this.emit('transcription', event)
  }

  send(audioData: Buffer) {
    if (this.connection) {
      this.connection.send(audioData)
    }
  }

  async stop() {
    if (this.connection) {
      this.connection.finish()
      this.connection = null
    }
  }
}
