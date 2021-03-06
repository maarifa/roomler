
import { v4 as uuid } from 'uuid'
import { resolutions } from '@/utils/resolutions'
import qs from 'qs'

const defaultResolution = resolutions.find(r => r.label === 'QVGA - 320x240')

export const defaultMedia = {
  speakers: {
    device: 'default'
  },
  audio: {
    enabled: false,
    muted: false,
    codec: null,
    device: 'default'
  },
  video: {
    enabled: false,
    muted: false,
    codec: null,
    resolution: defaultResolution.label,
    width: defaultResolution.width,
    height: defaultResolution.height,
    device: 'default'
  },
  screen: {
    enabled: false,
    muted: false,
    codec: null
  },
  data: {
    enabled: false
  }
}

export function isObject (item) {
  return (item && typeof item === 'object' && !Array.isArray(item))
}

export function mergeDeep (target, ...sources) {
  if (!sources.length) return target
  const source = sources.shift()

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} })
        mergeDeep(target[key], source[key])
      } else {
        Object.assign(target, { [key]: source[key] })
      }
    }
  }

  return mergeDeep(target, ...sources)
}

export function queryToModel (query) {
  const model = qs.parse(query, {
    decoder (value) {
      if (/^(\d+|\d*\.\d+)$/.test(value)) {
        return parseFloat(value)
      }

      const keywords = {
        true: true,
        false: false,
        null: null,
        undefined
      }
      if (value in keywords) {
        return keywords[value]
      }

      return value
    }
  })
  return model
}

export function modelToQuery (model) {
  const query = qs.stringify(model, { encode: false })
  return query
}

export class HandleDto {
  constructor (sessionDto, args) {
    const displayParts = args && args.display ? args.display.split('?') : []
    const media = displayParts && displayParts.length ? mergeDeep({}, defaultMedia, queryToModel(displayParts[1])) : defaultMedia
    this.media = media
    if (args.audioCodec) {
      this.media.audio.codec = args.audioCodec
    }
    if (args.audioDevice) {
      this.media.audio.codec = args.audioCodec
      this.media.audio.device = args.audioDevice
    }
    if (args.videoCodec) {
      this.media.video.codec = args.videoCodec
    }
    if (args.videoDevice) {
      this.media.video.codec = args.videoCodec
      this.media.video.device = args.videoDevice
    }
    if (args.speakersDevice) {
      this.media.speakers.device = args.speakersDevice
    }
    const mediaPart = modelToQuery(this.media)

    this.id = args.id || uuid()
    this.call_id = args.call_id
    this.private_id = args.private_id || uuid()
    this.feed = null
    this.display = `${displayParts[0]}?${mediaPart}`
    this.display_name = displayParts[0]
    this.sessionDto = sessionDto
    this.plugin = args.plugin || 'janus.plugin.videoroom'
    this.roomid = args.roomid || null
    this.room = args.room
    this.token = args.token || undefined
    this.stream = args.stream || null

    this.consentDialog = false
    this.webrtcState = false
    this.iceState = false
    this.iceStateReason = null
    this.mediaState = {
      audio: false,
      video: false,
      data: false,
      resolution: null,
      audioDevice: null,
      videoDevice: null
    }
    this.sip = {
      register: {
        proxy: `sip:${sessionDto.user._id}@${sessionDto.asteriskUrl}`,
        username: `sip:${sessionDto.user._id}@${sessionDto.asteriskUrl}`,
        authuser: `${sessionDto.user._id}`,
        secret: `${sessionDto.user.timestamp}`,
        display_name: sessionDto.user.username
      },
      call: {
        uri: `sip:${this.roomid}@${sessionDto.asteriskUrl}`
      }
    }
    this.simulcast = args.simulcast !== undefined ? args.simulcast : false
    this.iceRestart = args.iceRestart !== undefined ? args.iceRestart : true
    this.trickle = args.trickle !== undefined ? args.trickle : true

    this.isPublisher = args.isPublisher !== undefined ? args.isPublisher : false
    this.isLocal = args.isLocal !== undefined ? args.isLocal : true
    this.resolutions = resolutions
    this.timer = null
    this.interval = 1000
    this.bitrate = {
      limit: args.bitrateLimit || undefined,
      value: '0 kb/s'
    }
  }
}
