/**
 * Barulheira pra Dormir — v2.0 "25 Sons + Loop Perfeito"
 *
 * Mudanças principais:
 *  - 25 sons, todos sintetizados do zero em Python (numpy/scipy)
 *    → zero risco de direitos autorais
 *  - Loop gapless via PlaybackNearlyFinished (sem clique/corte)
 *  - Slot de voz SOM com 25 valores + sinônimos em português
 *  - DynamoDB: salva som atual, posição e estado do loop
 *  - URL do R2 via variável de ambiente (R2_BASE_URL) — não fica hardcoded
 *
 * Configurar na Lambda → Configuration → Environment variables:
 *   R2_BASE_URL = https://<seu-subdominio>.r2.dev   (sem barra no final)
 *
 * Stack: ASK SDK v2 · AWS Lambda Node.js 20.x · Cloudflare R2 · DynamoDB
 * Data: julho/2026
 */

'use strict';

const Alexa = require('ask-sdk-core');
const { DynamoDbPersistenceAdapter } = require('ask-sdk-dynamodb-persistence-adapter');

// ─── Configuração ─────────────────────────────────────────────────────────────
// URL do R2 via env var — nunca hardcode em repositório público!
const R2_BASE = process.env.R2_BASE_URL;
if (!R2_BASE) {
  throw new Error('Variável de ambiente R2_BASE_URL não configurada na Lambda.');
}

const DYNAMO_TABLE = process.env.DYNAMO_TABLE || 'jarra-de-sonhos-estado';

const persistenceAdapter = new DynamoDbPersistenceAdapter({
  tableName: DYNAMO_TABLE,
  createTable: true,
});

// ─── Catálogo de sons ────────────────────────────────────────────────────────
// Todos os arquivos são sintetizados do zero — nenhum copyright.
// nave-do-buda e nave-espacial apontam para o mesmo arquivo no R2.
const SOUNDS = {
  'ruido-branco':    { file: 'ruido-branco.mp3',    label: 'ruído branco'        },
  'ruido-rosa':      { file: 'ruido-rosa.mp3',      label: 'ruído rosa'          },
  'ruido-marrom':    { file: 'ruido-marrom.mp3',    label: 'ruído marrom'        },
  'ruido-azul':      { file: 'ruido-azul.mp3',      label: 'ruído azul'          },
  'ruido-violeta':   { file: 'ruido-violeta.mp3',   label: 'ruído violeta'       },
  'chuva':           { file: 'chuva.mp3',           label: 'chuva'               },
  'chuva-na-floresta': { file: 'chuva-na-floresta.mp3', label: 'chuva na floresta' },
  'trovao':          { file: 'trovao.mp3',          label: 'trovão'              },
  'ondas-do-mar':    { file: 'ondas-do-mar.mp3',    label: 'ondas do mar'        },
  'riacho':          { file: 'riacho.mp3',          label: 'riacho'              },
  'floresta':        { file: 'floresta.mp3',        label: 'floresta'            },
  'grilos':          { file: 'grilos.mp3',          label: 'grilos'              },
  'passaros':        { file: 'passaros.mp3',        label: 'pássaros'            },
  'lareira':         { file: 'lareira.mp3',         label: 'lareira'             },
  'fogueira':        { file: 'fogueira.mp3',        label: 'fogueira'            },
  'ventilador':      { file: 'ventilador.mp3',      label: 'ventilador'          },
  'ar-condicionado': { file: 'ar-condicionado.mp3', label: 'ar-condicionado'     },
  'nave-espacial':   { file: 'nave-espacial.mp3',   label: 'nave espacial'       },
  'nave-do-buda':    { file: 'nave-espacial.mp3',   label: 'Nave do Buda'        },
  'trem':            { file: 'trem.mp3',            label: 'trem'                },
  'aviao':           { file: 'aviao.mp3',           label: 'avião'               },
  'batimento-cardiaco': { file: 'batimento-cardiaco.mp3', label: 'batimento cardíaco' },
  'respiracao':      { file: 'respiracao.mp3',      label: 'respiração'          },
  'tom-432hz':       { file: 'tom-432hz.mp3',       label: 'tom 432 Hz'          },
  'om':              { file: 'om.mp3',              label: 'OM'                  },
};

const DEFAULT_SOUND = 'ruido-marrom';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function audioUrl(soundKey) {
  return `${R2_BASE}/${SOUNDS[soundKey].file}`;
}

function resolveSound(slotValue) {
  if (!slotValue) return DEFAULT_SOUND;
  const normalized = slotValue
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
  if (SOUNDS[normalized]) return normalized;
  for (const key of Object.keys(SOUNDS)) {
    if (key.includes(normalized) || normalized.includes(key)) return key;
  }
  return DEFAULT_SOUND;
}

// ─── Handlers ─────────────────────────────────────────────────────────────────
const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
  },
  async handle(handlerInput) {
    const attrs = await handlerInput.attributesManager.getPersistentAttributes();
    const sound = attrs.currentSound || DEFAULT_SOUND;
    const offset = attrs.offsetMs || 0;
    const url = audioUrl(sound);
    const label = SOUNDS[sound]?.label || sound;
    return handlerInput.responseBuilder
      .speak(`Barulheira pra Dormir. Tocando ${label}. Boa noite!`)
      .addAudioPlayerPlayDirective('REPLACE_ALL', url, sound, offset)
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
    const slotValue =
      handlerInput.requestEnvelope.request.intent.slots?.som?.value || null;
    const sound = resolveSound(slotValue);
    const label = SOUNDS[sound]?.label || sound;
    const url = audioUrl(sound);
    const attrs = { currentSound: sound, offsetMs: 0, loop: true };
    handlerInput.attributesManager.setPersistentAttributes(attrs);
    await handlerInput.attributesManager.savePersistentAttributes();
    return handlerInput.responseBuilder
      .speak(`Tocando ${label}.`)
      .addAudioPlayerPlayDirective('REPLACE_ALL', url, sound, 0)
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
      handlerInput.requestEnvelope.context?.AudioPlayer?.offsetInMilliseconds || 0;
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
    const sound = attrs.currentSound || DEFAULT_SOUND;
    const offset = attrs.offsetMs || 0;
    const url = audioUrl(sound);
    return handlerInput.responseBuilder
      .addAudioPlayerPlayDirective('REPLACE_ALL', url, sound, offset)
      .getResponse();
  },
};

const LoopOnIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.LoopOnIntent'
    );
  },
  async handle(handlerInput) {
    const attrs = await handlerInput.attributesManager.getPersistentAttributes();
    attrs.loop = true;
    handlerInput.attributesManager.setPersistentAttributes(attrs);
    await handlerInput.attributesManager.savePersistentAttributes();
    return handlerInput.responseBuilder
      .speak('Repetição ativada.')
      .getResponse();
  },
};

const LoopOffIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.LoopOffIntent'
    );
  },
  async handle(handlerInput) {
    const attrs = await handlerInput.attributesManager.getPersistentAttributes();
    attrs.loop = false;
    handlerInput.attributesManager.setPersistentAttributes(attrs);
    await handlerInput.attributesManager.savePersistentAttributes();
    return handlerInput.responseBuilder
      .speak('Repetição desativada. O som vai parar quando terminar.')
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

// ─── Loop gapless ─────────────────────────────────────────────────────────────
const PlaybackNearlyFinishedHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) ===
      'AudioPlayer.PlaybackNearlyFinished'
    );
  },
  async handle(handlerInput) {
    const attrs = await handlerInput.attributesManager.getPersistentAttributes();
    if (attrs.loop === false) {
      return handlerInput.responseBuilder.getResponse();
    }
    const sound =
      handlerInput.requestEnvelope.request.token ||
      attrs.currentSound ||
      DEFAULT_SOUND;
    const url = audioUrl(sound);
    return handlerInput.responseBuilder
      .addAudioPlayerPlayDirective('ENQUEUE', url, sound, 0, sound)
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
    const exemplos = ['chuva', 'ondas do mar', 'ruído branco', 'lareira', 'nave espacial'];
    const lista = exemplos.join(', ');
    return handlerInput.responseBuilder
      .speak(`Você pode dizer: toque ${exemplos[0]}, ou toque ${exemplos[1]}. Sons disponíveis: ${lista}, e muito mais.`)
      .getResponse();
  },
};

const FallbackIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.FallbackIntent'
    );
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak('Não entendi. Diga o nome de um som, como chuva ou ondas do mar.')
      .getResponse();
  },
};

const ErrorHandler = {
  canHandle() { return true; },
  handle(handlerInput, error) {
    console.error('[Barulheira] Erro:', JSON.stringify(error, null, 2));
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
    LoopOnIntentHandler,
    LoopOffIntentHandler,
    StopCancelIntentHandler,
    PlaybackNearlyFinishedHandler,
    AudioPlayerGenericHandler,
    HelpIntentHandler,
    FallbackIntentHandler,
  )
  .addErrorHandlers(ErrorHandler)
  .withPersistenceAdapter(persistenceAdapter)
  .lambda();
