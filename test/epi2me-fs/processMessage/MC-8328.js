import assert from 'assert';
import sinon from 'sinon';
import tmp from 'tmp';
import fs from 'fs-extra';
import path from 'path';
import { merge } from 'lodash';
import AWS from 'aws-sdk';
import { EPI2ME_FS as EPI2ME } from '../../../src/epi2me-fs';

describe('epi2me-api.processMessage', () => {
  describe('MC-8328', () => {
    const clientFactory = (opts) => {
      const client = new EPI2ME(
        merge(
          {
            url: 'https://epi2me-test.local',
            log: {
              debug: sinon.stub(),
              info: sinon.stub(),
              warn: sinon.stub(),
              error: sinon.stub(),
              critical: sinon.stub(),
            },
          },
          opts,
        ),
      );
      sinon.stub(client, 'socket').resolves({
        emit: () => {},
      });
      return client;
    };

    let stubs;
    beforeEach(() => {
      stubs = [];
    });

    afterEach(() => {
      stubs.forEach((s) => {
        s.restore();
      });
    });

    const message = {
      key_id: 'a14b0525-cb44-4f5c-8f12-96f858c6f09f',
      bucket: 'eu-west-1-metrichor-live',
      components: {
        0: {
          inputQueueName: '0F95872C-D6D2-11E8-9DBC-0371A22B323C',
        },
        1: {
          command:
            'python /usr/local/bin/fq_homogenizer.py --input_folder %inputfolder --min_qscore %min_qscore --regex *.fastq --detect_barcode %detect_barcode',
          params: {
            output_format: 'fastq',
            detect_barcode: 'Auto',
            user_defined: {},
            min_qscore: '7',
            ports: [
              {
                port: '*',
                title: 'End workflow',
                type: 'output',
              },
              {
                type: 'output',
                title: 'Pass',
                port: 'PASS',
              },
            ],
          },
          fail: '0',
          next: {
            '*': '0',
            PASS: '0',
          },
          wid: 1693,
          inputQueueName: 'iq_homogenizer-3100',
          dockerRegistry: '622693934964.dkr.ecr.eu-west-1.amazonaws.com',
        },
      },
      id_workflow_instance: '182103',
      targetComponentId: '0',
      path: '0F95872C-D6D2-11E8-9DBC-0371A22B323C/2185/182103/component-2/PASS/fastq_runid_738d663ef9214e590fb4806bf5aed784b941fd48_1.fastq/fastq_runid_738d663ef9214e590fb4806bf5aed784b941fd48_1.fastq',
      telemetry: {
        filename: 'fastq_runid_738d663ef9214e590fb4806bf5aed784b941fd48_1.fastq.bam',
        id_workflow_instance: '182103',
        id_workflow: 1647,
        component_id: '2',
        params: {
          output_format: 'fastq.bam',
          reference: 's3://metrichor-prod-biodata-eu-west-1/reference-genomes/10710/ONT/lambda.fasta',
          ports: [
            {
              type: 'output',
              title: 'End workflow',
              port: '*',
            },
            {
              port: 'PASS',
              type: 'output',
              title: 'Pass',
            },
          ],
          cwl: 's3://metrichor-prod-cwl-eu-west-1/bioinformatics-workflows/telemap-workflow/amd64-v1.3.5-release/telemap_map_epi2me_directive.yml',
        },
        version: '2.55.6',
        itype: 'r3.8xlarge',
        ec2_instance: 'i-09d960a7e4b2d2411',
        message_id: '0c25e648-d239-44d4-9a93-18b30118889e',
        filesize: 28383807,
        timings: {
          t_wrkr_dn: '2018-10-23T15:00:00.272Z',
          t_wrkr_dl: '2018-10-23T15:00:01.062Z',
          t_wrkr_an: '2018-10-23T15:00:31.773Z',
          t_wrkr_ul: '2018-10-23T15:00:34.356Z',
        },
        id_master: '1694',
        message: 'upload ok',
        hints: {
          folder: 'pass',
        },
        batch_summary: {
          NA: {
            reads_num: 3842,
            exit_status: {
              'Workflow successful': 3655,
              'No alignment found': 187,
            },
            seqlen: 21252771,
            run_ids: {
              '738d663ef9214e590fb4806bf5aed784b941fd48': 3842,
            },
          },
          seqlen: 21252771,
          reads_num: 3842,
        },
        data_files: [
          '0F95872C-D6D2-11E8-9DBC-0371A22B323C/2185/182103/component-2/PASS/fastq_runid_738d663ef9214e590fb4806bf5aed784b941fd48_1.fastq.data.json',
        ],
        src_prefix:
          '0F95872C-D6D2-11E8-9DBC-0371A22B323C/2185/182103/component-1/PASS/fastq_runid_738d663ef9214e590fb4806bf5aed784b941fd48_1.fastq/',
        tgt_prefix: '0F95872C-D6D2-11E8-9DBC-0371A22B323C/2185/182103/component-2/PASS/',
        id_user: '2185',
      },
      id_master: '1694',
    };
  });
});
