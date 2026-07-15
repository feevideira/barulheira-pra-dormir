'use strict';

const Alexa = require('ask-sdk-core');
const { DynamoDbPersistenceAdapter } = require('ask-sdk-dynamodb-persistence-adapter');

// =============================================================
// CONFIGURAÇÃO
// =============================================================
const R2_BASE = 'https://pub-5cacb16476b34033a5f44bc8a202286b.r2.dev';
const SKILL_NAME = 'Barulheira Pra Dormir';
const TABLE_NAME = 'jarra-de-sonhos-estado';
const DEFAULT_SOUND_ID = 'cachoeira';

// =============================================================
// SONS (7 no total)
// =============================================================
const SOUNDS = {
  'cachoeira':       { title: 'Cachoeira',       file: 'cachoeira.mp3' },
  'om':              { title: 'Om',              file: 'om.mp3' },
  'ondas-do-mar':    { title: 'Ondas do Mar',    file: 'ondas-do-mar.mp3' },
  'ruido-branco':    { title: 'Ruído Branco',    file: 'ruido-branco.mp3' },
  'ruido-rosa':      { title: 'Ruído Rosa',      file: 'ruido-rosa.mp3' },
  'submerso':        { title: 'Submerso',        file: 'submerso.mp3' },
  'tigela-tibetana': { title: 'Tigela Tibetana', file: 'tigela-tibetana.mp3' },
};

// =============================================================
// MAPEAMENTO SLOT → SOUND ID
// (inclui variações que a Alexa pode transcrever em pt-BR)
// =============================================================
const SLOT_TO_SOUND = {
  // cachoeira
  'cachoeira':  'cachoeira',
  'cascata':    'cachoeira',
  // om
  'om':     'om',
  'ohm':    'om',
  'aum':    'om',
  'mantra': 'om',
  // ondas do mar
  'ondas do mar': 'ondas-do-mar',
  'ondas':        'ondas-do-mar',
  'mar':          'ondas-do-mar',
  'praia':        'ondas-do-mar',
  'oceano':       'ondas-do-mar',
  'onda':         'ondas-do-mar',
  // ruido branco
  'ruído branco': 'ruido-branco',
  'ruido branco': 'ruido-branco',
  'ruído':        'ruido-branco',
  'ruido':        'ruido-branco',
  // ruido rosa
  'ruído rosa': 'ruido-rosa',
  'ruido rosa': 'ruido-rosa',
  'pink noise': 'ruido-rosa',
  // submerso
  'submerso':        'submerso',
  'debaixo d\'água': 'submerso',
  'fundo do mar':    'submerso',
  'embaixo d\'água': 'submerso',
  'underwater':      'submerso',
  // tigela tibetana
  'tigela tibetana': 'tigela-tibetana',
  'tigela':          'tigela-tibetana',
  'sino tibetano':   'tigela-tibetana',
  'bowl':            'tigela-tibetana',
  'sino':            'tigela-tibetana',
};

// =============================================================
// CATEGORIAS (para listar quando pedir "lista completa")
// =============================================================
const CATEGORIES = [
  { label: 'Natureza',    ids: ['cachoeira', 'ondas-do-mar'] },
  { label: 'Relaxamento', ids: ['om', 'tigela-tibetana', 'submerso'] },
  { label: 'Ruídos',      ids: ['ruido-branco', 'ruido-rosa'] },
];

const WELCOME_SPEECH =
  'Bem-vindo à Barulheira Pra Dormir! Qual som você gostaria de ouvir? ' +
  'Diga lista completa para ouvir todas as opções.';

const WELCOME_REPROMPT =
  'Qual som você quer ouvir? Diga o nome do som ou lista completa para ver todas as opções.';

function buildFullListSpeech() {
  const lines = CATEGORIES.map(c => {
    const names = c.ids.map(id => SOUNDS[id].title).join(', ');
    return `${c.label}: ${names}`;
  });
  return (
    'Temos 7 sons disponíveis. ' +
    lines.join('. ') +
    '. Qual você gostaria de ouvir?'
  );
}

// =============================================================
// HELPERS
// =============================================================
function getSoundId(slotValue) {
  if (!slotValue) return null;
  return SLOT_TO_SOUND[slotValue.toLowerCase().trim()] || null;
}

function buildPlayDirective(soundId, offsetMs = 0, behavior = 'REPLACE_ALL', previousToken = null) {
  const sound = SOUNDS[soundId];
  const stream = {
    token: soundId,
    url: `${R2_BASE}/${sound.file}`,
    offsetInMilliseconds: offsetMs,
  };
  if (behavior === 'ENQUEUE' && previousToken) {
    stream.expectedPreviousToken = previousToken;
  }
  return {
    type: 'AudioPlayer.Play',
    playBehavior: behavior,
    audioItem: {
      stream,
      metadata: { title: sound.title, subtitle: SKILL_NAME },
    },
  };
}

const persistenceAdapter = new DynamoDbPersistenceAdapter({
  tableName: TABLE_NAME,
  createTable: true,
});

// =============================================================
// HANDLERS
// =============================================================

const LaunchRequestHandler = {
  canHandle(h) {
    return Alexa.getRequestType(h.requestEnvelope) === 'LaunchRequest';
  },
  handle(h) {
    return h.responseBuilder
      .speak(WELCOME_SPEECH)
      .reprompt(WELCOME_REPROMPT)
      .getResponse();
  },
};

const ListSoundsIntentHandler = {
  canHandle(h) {
    return Alexa.getRequestType(h.requestEnvelope) === 'IntentRequest' &&
           Alexa.getIntentName(h.requestEnvelope) === 'ListSoundsIntent';
  },
  handle(h) {
    return h.responseBuilder
      .speak(buildFullListSpeech())
      .reprompt(WELCOME_REPROMPT)
      .getResponse();
  },
};

const PlaySoundIntentHandler = {
  canHandle(h) {
    return Alexa.getRequestType(h.requestEnvelope) === 'IntentRequest' &&
           Alexa.getIntentName(h.requestEnvelope) === 'PlaySoundIntent';
  },
  async handle(h) {
    const slotValue = Alexa.getSlotValue(h.requestEnvelope, 'SOM');
    const soundId = getSoundId(slotValue) || DEFAULT_SOUND_ID;
    const attrs = await h.attributesManager.getPersistentAttributes();
    attrs.lastSoundId = soundId;
    attrs.offsetInMilliseconds = 0;
    h.attributesManager.setPersistentAttributes(attrs);
    await h.attributesManager.savePersistentAttributes();
    return h.responseBuilder
      .speak(`Tocando ${SOUNDS[soundId].title}.`)
      .addDirective(buildPlayDirective(soundId))
      .withShouldEndSession(true)
      .getResponse();
  },
};

const PauseIntentHandler = {
  canHandle(h) {
    return Alexa.getRequestType(h.requestEnvelope) === 'IntentRequest' &&
           Alexa.getIntentName(h.requestEnvelope) === 'AMAZON.PauseIntent';
  },
  handle(h) {
    return h.responseBuilder.addDirective({ type: 'AudioPlayer.Stop' }).getResponse();
  },
};

const ResumeIntentHandler = {
  canHandle(h) {
    return Alexa.getRequestType(h.requestEnvelope) === 'IntentRequest' &&
           Alexa.getIntentName(h.requestEnvelope) === 'AMAZON.ResumeIntent';
  },
  async handle(h) {
    const attrs = await h.attributesManager.getPersistentAttributes();
    const soundId = (attrs.lastSoundId && SOUNDS[attrs.lastSoundId])
      ? attrs.lastSoundId
      : DEFAULT_SOUND_ID;
    const offsetMs = attrs.offsetInMilliseconds || 0;
    return h.responseBuilder
      .addDirective(buildPlayDirective(soundId, offsetMs))
      .withShouldEndSession(true)
      .getResponse();
  },
};

const StopIntentHandler = {
  canHandle(h) {
    return Alexa.getRequestType(h.requestEnvelope) === 'IntentRequest' &&
           (Alexa.getIntentName(h.requestEnvelope) === 'AMAZON.StopIntent' ||
            Alexa.getIntentName(h.requestEnvelope) === 'AMAZON.CancelIntent');
  },
  handle(h) {
    return h.responseBuilder.addDirective({ type: 'AudioPlayer.Stop' }).getResponse();
  },
};

// Seamless loop: enfileira o próximo loop antes do fim
const PlaybackNearlyFinishedHandler = {
  canHandle(h) {
    return Alexa.getRequestType(h.requestEnvelope) === 'AudioPlayer.PlaybackNearlyFinished';
  },
  handle(h) {
    const token = h.requestEnvelope.request.token;
    const soundId = (token && SOUNDS[token]) ? token : DEFAULT_SOUND_ID;
    return h.responseBuilder
      .addDirective(buildPlayDirective(soundId, 0, 'ENQUEUE', token))
      .getResponse();
  },
};

const PlaybackStartedHandler = {
  canHandle(h) {
    return Alexa.getRequestType(h.requestEnvelope) === 'AudioPlayer.PlaybackStarted';
  },
  async handle(h) {
    const token = h.requestEnvelope.request.token;
    if (token && SOUNDS[token]) {
      const attrs = await h.attributesManager.getPersistentAttributes();
      attrs.lastSoundId = token;
      attrs.offsetInMilliseconds = h.requestEnvelope.request.offsetInMilliseconds || 0;
      h.attributesManager.setPersistentAttributes(attrs);
      await h.attributesManager.savePersistentAttributes();
    }
    return h.responseBuilder.getResponse();
  },
};

const PlaybackStoppedHandler = {
  canHandle(h) {
    return Alexa.getRequestType(h.requestEnvelope) === 'AudioPlayer.PlaybackStopped';
  },
  async handle(h) {
    const token = h.requestEnvelope.request.token;
    if (token && SOUNDS[token]) {
      const attrs = await h.attributesManager.getPersistentAttributes();
      attrs.lastSoundId = token;
      attrs.offsetInMilliseconds = h.requestEnvelope.request.offsetInMilliseconds || 0;
      h.attributesManager.setPersistentAttributes(attrs);
      await h.attributesManager.savePersistentAttributes();
    }
    return h.responseBuilder.getResponse();
  },
};

const AudioPlayerGenericHandler = {
  canHandle(h) {
    const t = Alexa.getRequestType(h.requestEnvelope);
    return t === 'AudioPlayer.PlaybackFinished' ||
           t === 'AudioPlayer.PlaybackFailed' ||
           t === 'System.ExceptionEncountered';
  },
  handle(h) {
    if (Alexa.getRequestType(h.requestEnvelope) === 'AudioPlayer.PlaybackFailed') {
      console.error('Playback failed:', JSON.stringify(h.requestEnvelope.request.error));
    }
    return h.responseBuilder.getResponse();
  },
};

const HelpIntentHandler = {
  canHandle(h) {
    return Alexa.getRequestType(h.requestEnvelope) === 'IntentRequest' &&
           Alexa.getIntentName(h.requestEnvelope) === 'AMAZON.HelpIntent';
  },
  handle(h) {
    return h.responseBuilder
      .speak(WELCOME_SPEECH)
      .reprompt(WELCOME_REPROMPT)
      .getResponse();
  },
};

const FallbackHandler = {
  canHandle() { return true; },
  handle(h) {
    const t = Alexa.getRequestType(h.requestEnvelope);
    if (t === 'IntentRequest') {
      return h.responseBuilder
        .speak('Desculpe, não entendi. ' + WELCOME_REPROMPT)
        .reprompt(WELCOME_REPROMPT)
        .getResponse();
    }
    return h.responseBuilder.getResponse();
  },
};

// =============================================================
// SKILL BUILDER
// =============================================================
exports.handler = Alexa.SkillBuilders.custom()
  .addRequestHandlers(
    LaunchRequestHandler,
    ListSoundsIntentHandler,
    PlaySoundIntentHandler,
    HelpIntentHandler,
    PauseIntentHandler,
    ResumeIntentHandler,
    StopIntentHandler,
    PlaybackNearlyFinishedHandler,
    PlaybackStartedHandler,
    PlaybackStoppedHandler,
    AudioPlayerGenericHandler,
    FallbackHandler
  )
  .withPersistenceAdapter(persistenceAdapter)
  .lambda();
