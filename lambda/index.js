/**
 * Barulheira pra Dormir — v1.0 "MVP de 7 Sons"
 * Primeira versão funcional. 7 sons baixados de repositórios CC0,
 * sem slot de voz, sem persistência de estado.
 *
 * Stack: ASK SDK v2 · AWS Lambda · Cloudflare R2
 * Data: julho/2026
 */

const Alexa = require('ask-sdk-core');

// ─── Configuração ────────────────────────────────────────────────────────────
const R2_BASE = 'https://pub-5cacb16476b34033a5f44bc8a202286b.r2.dev';

const SOUNDS = {
  chuva:       { file: 'rain.mp3',        label: 'chuva'          },
  ruido_branco:{ file: 'white_noise.mp3', label: 'ruído branco'   },
  ruido_rosa:  { file: 'pink_noise.mp3',  label: 'ruído rosa'     },
  ventilador:  { file: 'fan.mp3',         label: 'ventilador'     },
  ondas:       { file: 'ocean_waves.mp3', label: 'ondas do mar'   },
  lareira:     { file: 'fireplace.mp3',   label: 'lareira'        },
  nave:        { file: 'spaceship.mp3',   label: 'nave espacial'  },
};

const DEFAULT_SOUND = 'nave';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function audioUrl(file) {
  return `${R2_BASE}/${file}`;
}

function playDirective(soundKey, offsetMs = 0) {
  const sound = SOUNDS[soundKey];
  return {
    type: 'AudioPlayer.Play',
    playBehavior: 'REPLACE_ALL',
    audioItem: {
      stream: {
        token: soundKey,
        url: audioUrl(sound.file),
        offsetInMilliseconds: offsetMs,
      },
    },
  };
}

// ─── Handlers ─────────────────────────────────────────────────────────────────
const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
  },
  handle(handlerInput) {
    const sound = SOUNDS[DEFAULT_SOUND];
    return handlerInput.responseBuilder
      .speak(`Tocando ${sound.label}. Boa noite!`)
      .addAudioPlayerPlayDirective('REPLACE_ALL', audioUrl(sound.file), DEFAULT_SOUND, 0)
      .getResponse();
  },
};

const PlaySoundIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'PlaySoundIntent'
    );
  },
  handle(handlerInput) {
    // Versão 1.0: sem slot — sempre toca o som padrão
    const sound = SOUNDS[DEFAULT_SOUND];
    return handlerInput.responseBuilder
      .speak(`Tocando ${sound.label}.`)
      .addAudioPlayerPlayDirective('REPLACE_ALL', audioUrl(sound.file), DEFAULT_SOUND, 0)
      .getResponse();
  },
};

const PauseIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.PauseIntent'
    );
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .addAudioPlayerStopDirective()
      .getResponse();
  },
};

const ResumeIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.ResumeIntent'
    );
  },
  handle(handlerInput) {
    const sound = SOUNDS[DEFAULT_SOUND];
    return handlerInput.responseBuilder
      .addAudioPlayerPlayDirective('REPLACE_ALL', audioUrl(sound.file), DEFAULT_SOUND, 0)
      .getResponse();
  },
};

const StopCancelIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      ['AMAZON.StopIntent', 'AMAZON.CancelIntent'].includes(
        Alexa.getIntentName(handlerInput.requestEnvelope)
      )
    );
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak('Boa noite!')
      .addAudioPlayerStopDirective()
      .getResponse();
  },
};

const PlaybackNearlyFinishedHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) ===
      'AudioPlayer.PlaybackNearlyFinished'
    );
  },
  handle(handlerInput) {
    const token = handlerInput.requestEnvelope.request.token || DEFAULT_SOUND;
    const sound = SOUNDS[token] || SOUNDS[DEFAULT_SOUND];
    return handlerInput.responseBuilder
      .addAudioPlayerPlayDirective('ENQUEUE', audioUrl(sound.file), token, 0, token)
      .getResponse();
  },
};

const AudioPlayerGenericHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope).startsWith('AudioPlayer.');
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder.getResponse();
  },
};

const HelpIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent'
    );
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak('Diga "toque chuva", "toque ventilador" ou simplesmente abra a skill para ouvir a nave espacial.')
      .getResponse();
  },
};

const ErrorHandler = {
  canHandle() { return true; },
  handle(handlerInput, error) {
    console.error('Erro:', error.message);
    return handlerInput.responseBuilder
      .speak('Ops, algo deu errado. Tente novamente.')
      .getResponse();
  },
};

// ─── Exporta a skill ─────────────────────────────────────────────────────────
exports.handler = Alexa.SkillBuilders.custom()
  .addRequestHandlers(
    LaunchRequestHandler,
    PlaySoundIntentHandler,
    PauseIntentHandler,
    ResumeIntentHandler,
    StopCancelIntentHandler,
    PlaybackNearlyFinishedHandler,
    AudioPlayerGenericHandler,
    HelpIntentHandler,
  )
  .addErrorHandlers(ErrorHandler)
  .lambda();
