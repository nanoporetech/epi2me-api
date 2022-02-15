import { getExperiments } from '@metrichor/epi2me-api'

async function main () {
  const samples = await getExperiments();

  for (const [experiment, metadata] of Object.entries(samples)) {
    console.log({ experiment, metadata });
  }
}

main().catch(console.error)