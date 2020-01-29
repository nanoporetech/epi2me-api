/**
 * Copyright Metrichor Ltd. (An Oxford Nanopore Technologies Company) 2020
 */

"use strict";var e=require("lodash"),t={local:!1,url:"https://epi2me.nanoporetech.com",user_agent:"EPI2ME API",region:"eu-west-1",sessionGrace:5,uploadTimeout:1200,downloadTimeout:1200,fileCheckInterval:5,downloadCheckInterval:3,stateCheckInterval:60,inFlightDelay:600,waitTimeSeconds:20,waitTokenError:30,transferPoolSize:3,downloadMode:"data+telemetry",filetype:[".fastq",".fq",".fastq.gz",".fq.gz"],signing:!0};module.exports=class{constructor(i,l){this.allProfileData={},this.defaultEndpoint=process.env.METRICHOR||t.endpoint||t.url,this.raiseExceptions=l,i&&(this.allProfileData=e.merge(i,{profiles:{}})),this.allProfileData.endpoint&&(this.defaultEndpoint=this.allProfileData.endpoint)}profile(t){return t?e.merge({endpoint:this.defaultEndpoint},this.allProfileData.profiles[t]):{}}profiles(){return Object.keys(this.allProfileData.profiles||{})}};
