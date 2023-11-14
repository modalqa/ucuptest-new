# UcupTest
Simple API Test Framework

## Introduction

Ucuptest.js an API testing tool built on top of
[Axios](https://axios-http.com) that makes testing API endpoints easy,
fast and fun.

## Installation

Install Frisby v2.x from NPM into your project:

    npm install ucuptest

## Creating Tests

### Simple Example

The minimum setup to run a single test expectation.

```javascript
const { Ucuptest, Joi, assert } = require('./ucuptest');

const ucuptest = new Ucuptest();
ucuptest.setBaseUrl('https://balsam-loving-legal.glitch.me');

describe('Ucuptest', function () {
    this.timeout(5000);
  it('Retrieving user data', async function () {
    try {
      const response = await ucuptest.get('/users/2', {}, Joi.object({
        username: Joi.string().required(),
        email: Joi.string().email().required(),
        password: Joi.string().required(),
        id: Joi.number().required(),
      }), 'Test case: Retrieving user data');

      console.log('GET Response:', response);
    } catch (error) {
      console.error('GET Error:', error.message);
    }
  });
});

ucuptest.runTests();
```
