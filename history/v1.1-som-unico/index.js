/**
 * Barulheira pra Dormir — v1.1 "Som Único"
 * Decisão estratégica: simplificar o MVP para um único som (ruído rosa
 * rebatizado como "Nave do Buda") e validar o loop antes de expandir.
 * Introduz DynamoDB para salvar estado entre sessões.
 * Projeto renomeado de "Jarra de Sonhos" → "Barulheira pra Dormir".
 *
 * BUG CONHECIDO (corrigido na v2.0): arquivo no R2 estava salvo com
 * extensão dupla (.mp3.mp3). A URL abaixo reflete o estado real do bucket
 * na época — não alterar para fins históricos.
 *
 * Stack: ASK SDK v2 · AWS Lambda · Cloudflare R2 · DynamoDB
 * Data: julho/2026
 */

const Alexa = require('ask-sdk-core');
const { DynamoDbPersistenceAdapter } = require('ask-sdk-dynamodb-persistence-adapter');

// ─── Configuração ─────────────────────────────────────────────────────────────
// BUG: extensão dupla (.mp3.mp3) — arquivo foi salvo assim no R2
const AUDIO_URL = 'https://pub-5cacb16476b34033a5f44bc8a202286b.r2.dev/pink_noise.mp3.mp3';
const SOUND_TOKEN = 'nave-do-buda';
const SOUND_LABEL = 'Nave do Buda';

const persistenceAdapter = new DynamoDbPersistenceAdapter({
  tableName: 'barulheira-pra-dormir-estado',
  createTable: true,
});

// ─── Handlers ────────────────────────────────────────────────────────────────
const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
  },
  async handle(handlerInput) {
    const attrs = await handlerInput.attributesManager.getPersistentAttributes();
    const offset = attrs.offsetMs || 0;
    await handlerInput.attributesManager.savePersistentAttributes();
    return handlerInput.responseBuilder
      .speak(`Tocando ${SOUND_LABEL}. Boa noite!`)
      .addAudioPlayerPlayDirective('REPLACE_ALL', AUDIO_URL, SOUND_TOKEN, offset)
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
  async handle(handlerInput) {
    const attrs = { currentSound: SOUND_TOKEN, offsetMs: 0, loop: true };
    handlerInput.attributesManager.setPersistentAttributes(attrs);
    await handlerInput.attributesManager.savePersistentAttributes();
    return handlerInput.responseBuilder
      .speak(`Tocando ${SOUND_LABEL}.`)
      .addAudioPlayerPlayDirective('REPLACE_ALL', AUDIO_URL, SOUND_TOKEN, 0)
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
  async handle(handlerInput) {
    const offset =
      handlerInput.requestEnvelope.context.AudioPlayer?.offsetInMilliseconds || 0;
    const attrs = await handlerInput.attributesManager.getPersistentAttributes();
    attrs.offsetMs = offset;
    handlerInput.attributesManager.setPersistentAttributes(attrs);
    await handlerInput.attributesManager.savePersistentAttributes();
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
  async handle(handlerInput) {
    const attrs = await handlerInput.attributesManager.getPersistentAttributes();
    const offset = attrs.offsetMs || 0;
    return handlerInput.responseBuilder
      .addAudioPlayerPlayDirective('REPLACE_ALL', AUDIO_URL, SOUND_TOKEN, offset)
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
    return handlerInput.responseBuilder
      .addAudioPlayerPlayDirective('ENQUEUE', AUDIO_URL, SOUND_TOKEN, 0, SOUND_TOKEN)
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
      .speak('Diga "toque a nave do buda" ou simplesmente abra a skill para começar.')
      .getResponse();
  },
};

const ErrorHandler = {
  canHandle() { return true; },
  handle(handlerInput, error) {
    console.error('Erro:', error.message);
    return handlerInput.responseBuilder
      .speak('Algo deu errado. Tente novamente.')
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
  .withPersistenceAdapter(persistenceAdapter)
  .lambda();
