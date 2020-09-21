import assert from 'assert';
import { merge } from 'lodash';
import sinon from 'sinon';
import { EPI2ME_FS as EPI2ME } from '../../src/epi2me-fs';

describe('epi2me.setClassConfigREST', () => {
  const clientFactory = (opts) =>
    new EPI2ME(
      merge(
        {
          url: 'https://epi2me-test.local',
          log: {
            debug: sinon.stub(),
            info: sinon.stub(),
            warn: sinon.stub(),
            error: sinon.stub(),
            json: sinon.stub(),
          },
        },
        opts,
      ),
    );

  const expected = {
    id_workflow_instance: '134235',
    id_workflow: '540',
    remote_addr: '127.0.0.1',
    key_id: '82eae478-cf86-4d48-907c-ceda2342037e',
    bucket: 'eu-west-1-metrichor-local',
    start_date: '2020-04-30T15:20:30+00:00',
    id_user: '5089',
    inputQueueName: '6551d65b-0441-c9ab-81aa-ba33ed62c39e',
    outputQueueName: 'fe7aed1e-97b5-45bb-a011-64918306acc0',
    region: 'eu-west-1',
    bucketFolder: 'fe7aed1e-97b5-45bb-a011-64918306acc0/5089/134235',
    summaryTelemetry: { 1964: { 'CTC Basecalling': '/workflow_instance/134235/classficiation_basecalling' } },
    chain: {
      components: {
        0: {
          inputQueueName: 'e07592d4-fae8-4212-94d7-74ffbc7fae58',
        },
        1: {
          wid: '540',
          next: {
            PASS: 0,
          },
          params: {
            cwl: '',
            ports: [],
            cutoff: 324,
            user_defined: {},
          },
          command:
            'cgd --working_directory %inputfolder -o %outputfolder -d %cwl workflow.data.fastq.path=%inputfolder',
          dockerImage: null,
          inputQueueName: '6551d65b-0441-c9ab-81aa-ba33ed62c39e',
        },
      },
      targetComponentId: 1,
    },
  };
  it('sets rest instance config as expected', async () => {
    const client = clientFactory();
    client.setClassConfigREST({
      id_workflow_instance: '134235',
      id_workflow: '540',
      remote_addr: '127.0.0.1',
      key_id: '82eae478-cf86-4d48-907c-ceda2342037e',
      bucket: 'eu-west-1-metrichor-local',
      start_date: '2020-04-30T15:20:30+00:00',
      id_user: '5089',
      inputqueue: '6551d65b-0441-c9ab-81aa-ba33ed62c39e',
      outputqueue: 'fe7aed1e-97b5-45bb-a011-64918306acc0',
      region: 'eu-west-1',
      telemetry: { 1964: { 'CTC Basecalling': '/workflow_instance/134235/classficiation_basecalling' } },
      chain: {
        components: {
          0: {
            inputQueueName: 'e07592d4-fae8-4212-94d7-74ffbc7fae58',
          },
          1: {
            wid: '540',
            next: {
              PASS: 0,
            },
            params: {
              cwl: '',
              ports: [],
              cutoff: 324,
              user_defined: {},
            },
            command:
              'cgd --working_directory %inputfolder -o %outputfolder -d %cwl workflow.data.fastq.path=%inputfolder',
            dockerImage: null,
            inputQueueName: '6551d65b-0441-c9ab-81aa-ba33ed62c39e',
          },
        },
        targetComponentId: 1,
      },
    });
    Object.keys(expected).forEach((k) => {
      assert.deepStrictEqual(client.config.instance[k], expected[k]);
    });
  });
  it('sets gql instance config as expected', async () => {
    const client = clientFactory();
    client.setClassConfigGQL({
      data: {
        startData: {
          bucket: 'eu-west-1-metrichor-local',
          idUser: '5089',
          remoteAddr: '127.0.0.1',
          instance: {
            idWorkflowInstance: '134235',
            chain: {
              components: {
                0: {
                  inputQueueName: 'e07592d4-fae8-4212-94d7-74ffbc7fae58',
                },
                1: {
                  wid: '540',
                  next: {
                    PASS: 0,
                  },
                  params: {
                    cwl: '',
                    ports: [],
                    cutoff: 324,
                    user_defined: {},
                  },
                  command:
                    'cgd --working_directory %inputfolder -o %outputfolder -d %cwl workflow.data.fastq.path=%inputfolder',
                  dockerImage: null,
                  inputQueueName: '6551d65b-0441-c9ab-81aa-ba33ed62c39e',
                },
              },
              targetComponentId: 1,
            },
            keyId: '82eae478-cf86-4d48-907c-ceda2342037e',
            outputqueue: 'fe7aed1e-97b5-45bb-a011-64918306acc0',
            mappedTelemetry: { 1964: { 'CTC Basecalling': '/workflow_instance/134235/classficiation_basecalling' } },
            startDate: '2020-04-30T15:20:30+00:00',
            workflowImage: {
              inputqueue: '6551d65b-0441-c9ab-81aa-ba33ed62c39e',
              workflow: {
                idWorkflow: '540',
              },
              region: {
                name: 'eu-west-1',
              },
            },
          },
        },
      },
    });
    Object.keys(expected).forEach((k) => {
      assert.deepStrictEqual(client.config.instance[k], expected[k]);
    });
  });
});
