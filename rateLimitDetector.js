const axios = require('axios');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function testRateLimit(url, requestsPerMinute, requestTimeout) {
  let lastSafeRateLimit = 0;
  let currentRequestsPerMinute = requestsPerMinute;

  while (true) {
    let lastRequestMadeAtMs = 0;
    let rateLimited = false;
    const timeBetweenRequests = 60000 / currentRequestsPerMinute;

    console.log(
      `Testing with ${currentRequestsPerMinute} requests per minute `
      + `(${timeBetweenRequests}ms between requests)...`
    );

    for (let i = 0; i < currentRequestsPerMinute; i++) {
      console.debug(`${i + 1}/${currentRequestsPerMinute} ...`)
      try {
        lastRequestMadeAtMs = Date.now();
        await axios.get(url, { timeout: requestTimeout * 1000 });
      } catch (error) {
        if (error.response && error.response.status === 429) {
          rateLimited = true;
          break;
        } else {
          console.error(`Error: ${error.message}`);
        }
      }

      if (Date.now() - lastRequestMadeAtMs < timeBetweenRequests) {
        await sleep(timeBetweenRequests - (Date.now() - lastRequestMadeAtMs));
      }
    }

    if (rateLimited) {
      console.warn(`Rate limit hit using ${currentRequestsPerMinute} requests per minute.`);
      if (lastSafeRateLimit === 0) {
        console.error("Unable to determine safe rate limit");
        process.exit(1);
      } else {
        console.log(`\nLast safe rate limit: \n\n >>>>>>> ${lastSafeRateLimit} <<<<<<\n\n`);
        process.exit(0);
      }
    } else {
      console.log(`No rate limit hit. Increasing rate to ${currentRequestsPerMinute + 1} requests per minute.`);
      lastSafeRateLimit = currentRequestsPerMinute;
      currentRequestsPerMinute += 10;
    }
  }
}

function showHelp() {
  console.log(`Usage: node ${process.argv[1]} <URL> <requestsPerMinute> <requestTimeout>`);
}

const args = process.argv.slice(2);

if (args.length !== 3) {
  showHelp();
  process.exit(1);
}

const url = args[0];
const requestsPerMinute = parseInt(args[1]);
const requestTimeout = parseInt(args[2]);

if (isNaN(requestsPerMinute) || isNaN(requestTimeout)) {
  showHelp();
  process.exit(1);
}

console.log(`Starting rate limit testing for URL: ${url}`);
testRateLimit(url, requestsPerMinute, requestTimeout);
