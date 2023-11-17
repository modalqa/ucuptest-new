const { Ucuptest } = require('../index');
const ucuptest = new Ucuptest();

ucuptest.setBaseUrl('https://jsonplaceholder.typicode.com'); // Ganti dengan base URL yang sesuai

ucuptest.get('/todos/1', {}, null, 'Simple Test')
  .then(responseData => {
    console.log(responseData)
  })
  .finally(() => {
    ucuptest.runTests();
  });
