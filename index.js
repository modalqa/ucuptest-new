const http = require('http');
const https = require('https');
const { URL } = require('url');
const querystring = require('querystring');
const fs = require('fs').promises;
const Joi = require('joi');
const assert = require('assert');

class Ucuptest {
  constructor() {
    this.baseUrl = '';
    this.tests = [];
    this.passedTests = 0;
    this.failedTests = 0;
    this.totalDuration = 0;
    this.requestInterceptors = [];
    this.responseInterceptors = [];
    this.abortController = new AbortController();
    this.cookies = {};
  }

  setBaseUrl(baseUrl) {
    this.baseUrl = baseUrl;
  }

  addRequestInterceptor(interceptor) {
    this.requestInterceptors.push(interceptor);
  }

  addResponseInterceptor(interceptor) {
    this.responseInterceptors.push(interceptor);
  }

  cancelRequest() {
    this.abortController.abort();
    this.abortController = new AbortController();
  }

  setCookie(name, value) {
    this.cookies[name] = value;
  }

  getCookie(name) {
    return this.cookies[name];
  }

  handleGlobalError(error) {
    // Handle errors globally (You can customize this part based on your requirements)
    console.error('Global Error:', error.message);
  }

  async makeRequest(method, url, data, description, startTime, additionalOptions = {}) {
    try {
      const urlObject = new URL(this.baseUrl + url);

      if (method === 'GET' && data) {
        urlObject.search = querystring.stringify(data);
      }

      // Set cookies in headers
      const cookieHeaders = Object.entries(this.cookies).map(([name, value]) => `${name}=${value}`);
      const requestOptions = {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookieHeaders.join('; '),
          ...additionalOptions.headers,
        },
        signal: this.abortController.signal,
        ...additionalOptions,
      };

      if (method !== 'GET' && data) {
        requestOptions.headers['Content-Length'] = Buffer.byteLength(JSON.stringify(data));
      }

      // Apply request interceptors
      for (const interceptor of this.requestInterceptors) {
        interceptor(requestOptions);
      }

      return new Promise((resolve, reject) => {
        const protocol = urlObject.protocol === 'https:' ? https : http;

        const req = protocol.request(urlObject, requestOptions, (res) => {
          let responseData = '';

          res.on('data', (chunk) => {
            responseData += chunk;
          });

          res.on('end', () => {
            try {
              responseData = JSON.parse(responseData);
            } catch (error) {
              // Do nothing if the response is not JSON
            }

            // Apply response interceptors
            for (const interceptor of this.responseInterceptors) {
              interceptor(res, responseData);
            }

            // Record end time and calculate duration
            const endTime = Date.now();
            const duration = endTime - startTime;

            // Add test information to the array
            this.tests.push({ description, status: 'PASS', duration });
            this.passedTests++;
            this.totalDuration += duration;

            // Extract cookies from the response and update the cookie store
            const responseCookies = res.headers['set-cookie'];
            if (responseCookies) {
              responseCookies.forEach(cookie => {
                const [name, value] = cookie.split(';')[0].split('=');
                this.setCookie(name, value);
              });
            }

            resolve({ status: res.statusCode, data: responseData });
          });
        });

        req.on('error', (error) => {
          // Check if the request was canceled
          if (error.name === 'AbortError') {
            console.log('Request canceled');
            return;
          }

          reject(error);
        });

        if (method !== 'GET' && data) {
          req.write(JSON.stringify(data));
        }

        req.end();
      });
    } catch (error) {
      // Handle global error
      this.handleGlobalError(error);

      // Re-throw the error to maintain the original behavior
      throw error;
    }
  }

  async test(method, url, data, schema, description, additionalOptions) {
    try {
      const startTime = Date.now();
      const { status, data: responseData } = await this.makeRequest(method, url, data, description, startTime, additionalOptions);
  
      // Add asynchronous assertion handling with Joi if schema is defined
      if (schema) {
        if (typeof schema.validateAsync === 'function') {
          await schema.validateAsync(responseData, { abortEarly: false });
        } else {
          // Handle synchronous validation if validateAsync is not available
          schema.validate(responseData, { abortEarly: false });
        }
      }
  
      return responseData;
    } catch (error) {
      // Add test information to the array
      this.tests.push({ description, status: 'FAIL' });
      this.failedTests++;
  
      throw error;
    }
  }

  async get(url, params = {}, schema, description, headers = {}) {
    return this.test('GET', url, params, schema, description, { headers });
  }

  async post(url, data = {}, schema, description, headers = {}) {
    return this.test('POST', url, data, schema, description, { headers });
  }

  async put(url, data = {}, schema, description, headers = {}) {
    return this.test('PUT', url, data, schema, description, { headers });
  }

  async delete(url, params = {}, schema, description, headers = {}) {
    return this.test('DELETE', url, params, schema, description, { headers });
  }

  async login(url, payload, schema, description, headers = {}) {
    return this.test('POST', url, payload, schema, description, { headers });
  }

  async inspectResponse(method, url, data, description, startTime, additionalOptions) {
    const { status, data: responseData } = await this.makeRequest(method, url, data, description, startTime, additionalOptions);
    return { status, data: responseData };
  }

  async uploadFile(url, file, description) {
    try {
      const startTime = Date.now();

      // Read the file content
      const fileContent = await fs.readFile(file);

      const requestOptions = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream', // Adjust the content type as needed
        },
      };

      const response = await this.makeRequest('POST', url, fileContent, description, startTime, requestOptions);

      // Add additional handling for the upload if needed

      return response;
    } catch (error) {
      // Handle errors or rethrow as needed
      console.error('Error uploading file:', error.message);
      throw error;
    }
  }

  async downloadFile(url, description) {
    try {
      const startTime = Date.now();

      const response = await this.makeRequest('GET', url, null, description, startTime);

      // Save the downloaded file
      const filename = `downloaded_${Date.now()}.txt`; // Change the filename and extension as needed
      await fs.writeFile(filename, JSON.stringify(response.data));

      // Add additional handling for the download if needed

      return filename; // Return the filename or the downloaded content as needed
    } catch (error) {
      // Handle errors or rethrow as needed
      console.error('Error downloading file:', error.message);
      throw error;
    }
  }

  async sendConcurrentRequests(requests) {
    try {
      const startTime = Date.now();
      const responses = await Promise.all(requests.map(request => this.makeRequest(request.method, request.url, request.data, request.description, startTime, request.additionalOptions)));

      // Add additional handling for concurrent requests if needed

      return responses;
    } catch (error) {
      // Handle errors or rethrow as needed
      console.error('Error sending concurrent requests:', error.message);
      throw error;
    }
  }

  async runTests() {
    // Run tests and print results
    this.tests.forEach(test => {
      console.log(`Test "${test.description}": ${test.status}`);
      // console.log(`Test "${test.description}": ${test.status} (${test.duration}ms)`);
    });

    console.log(`Duration: ${this.totalDuration}ms`);
    console.log(`${this.passedTests} PASS`);
    console.log(`${this.failedTests} FAIL`);
  }
}

module.exports = { Ucuptest, Joi, assert };
