import { workflow, node, trigger, expr } from '@n8n/workflow-sdk';

const scheduleTrigger = trigger({
  type: 'n8n-nodes-base.scheduleTrigger',
  version: 1.3,
  config: {
    name: 'M-W-F 8AM Schedule',
    parameters: {
      rule: {
        interval: [
          {
            field: 'cronExpression',
            cronExpression: '0 8 * * 1,3,5'
          }
        ]
      }
    },
    position: [100, 300]
  }
});

const manualTrigger = trigger({
  type: 'n8n-nodes-base.manualTrigger',
  version: 1,
  config: {
    name: 'Manual Start',
    position: [100, 450]
  }
});

const getTrends = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.3,
  config: {
    name: 'Fetch Google Trends',
    parameters: {
      method: 'POST',
      url: expr('{{ $env.PROJECT_URL || "http://localhost:3000" }}/api/trends'),
      authentication: 'none',
      sendHeaders: false,
      sendBody: false,
      options: {}
    },
    position: [300, 375]
  }
});

const brainstormConcept = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.3,
  config: {
    name: 'Brainstorm Story Concept',
    parameters: {
      method: 'POST',
      url: expr('{{ $env.PROJECT_URL || "http://localhost:3000" }}/api/ai/brainstorm'),
      authentication: 'none',
      sendBody: true,
      bodyParameters: {
        parameters: [
          {
            name: 'trend',
            value: expr('{{ $json.title }}')
          },
          {
            name: 'snippet',
            value: expr('{{ $json.snippet }}')
          }
        ]
      },
      options: {}
    },
    position: [500, 375]
  }
});

const generateScript = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.3,
  config: {
    name: 'Generate Scene Script',
    parameters: {
      method: 'POST',
      url: expr('{{ $env.PROJECT_URL || "http://localhost:3000" }}/api/ai/script'),
      authentication: 'none',
      sendBody: true,
      bodyParameters: {
        parameters: [
          {
            name: 'concept',
            value: expr('{{ $json.concept }}')
          }
        ]
      },
      options: {}
    },
    position: [700, 375]
  }
});

const checkMitigation = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.3,
  config: {
    name: 'Legal Compliance Audit',
    parameters: {
      method: 'POST',
      url: expr('{{ $env.PROJECT_URL || "http://localhost:3000" }}/api/ai/mitigation'),
      authentication: 'none',
      sendBody: true,
      bodyParameters: {
        parameters: [
          {
            name: 'scriptLines',
            value: expr('{{ $json.scriptLines }}')
          }
        ]
      },
      options: {}
    },
    position: [900, 375]
  }
});

const synthesizeVoice = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.3,
  config: {
    name: 'ElevenLabs Voice Synthesis',
    parameters: {
      method: 'POST',
      url: expr('{{ $env.PROJECT_URL || "http://localhost:3000" }}/api/ai/voice'),
      authentication: 'none',
      sendBody: true,
      bodyParameters: {
        parameters: [
          {
            name: 'lines',
            value: expr('{{ $json.mitigatedLines }}')
          }
        ]
      },
      options: {}
    },
    position: [1100, 375]
  }
});

const renderScenes = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.3,
  config: {
    name: 'Kling v2.6 Scene Render',
    parameters: {
      method: 'POST',
      url: expr('{{ $env.PROJECT_URL || "http://localhost:3000" }}/api/video/generate'),
      authentication: 'none',
      sendBody: true,
      bodyParameters: {
        parameters: [
          {
            name: 'storyboard',
            value: expr('{{ $json.storyboard }}')
          },
          {
            name: 'audioUrls',
            value: expr('{{ $json.audioUrls }}')
          }
        ]
      },
      options: {}
    },
    position: [1300, 375]
  }
});

const spliceAssemble = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.3,
  config: {
    name: 'FFmpeg Splicing Assembly',
    parameters: {
      method: 'POST',
      url: expr('{{ $env.PROJECT_URL || "http://localhost:3000" }}/api/render'),
      authentication: 'none',
      sendBody: true,
      bodyParameters: {
        parameters: [
          {
            name: 'renderJobId',
            value: expr('{{ $json.renderJobId }}')
          }
        ]
      },
      options: {}
    },
    position: [1500, 375]
  }
});

export default workflow('boomer-kev-orchestrator', 'Boomer & Kev Production Orchestrator')
  .add(scheduleTrigger)
  .to(getTrends)
  .add(manualTrigger)
  .to(getTrends)
  .add(getTrends)
  .to(brainstormConcept)
  .to(generateScript)
  .to(checkMitigation)
  .to(synthesizeVoice)
  .to(renderScenes)
  .to(spliceAssemble);
