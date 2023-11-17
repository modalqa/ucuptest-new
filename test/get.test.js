const { Ucuptest, assert } = require('../index');

// Membuat instance Ucuptest
const ucuptest = new Ucuptest();

// Mengatur base URL
ucuptest.setBaseUrl('https://jsonplaceholder.typicode.com'); // Ganti dengan base URL yang sesuai

// Menjalankan tes GET tanpa pengecekan skema
ucuptest.get('/todos/1', {}, null, 'Test GET /todos/1')
  .then(responseData => {
    // Melakukan assertion lebih lanjut jika diperlukan
    assert.strictEqual(responseData.userId, 1, 'userId should be 1');
    assert.strictEqual(responseData.id, 1, 'id should be 1');
    assert.strictEqual(responseData.title, 'delectus aut autem', 'title should be "delectus aut autem"');
    assert.strictEqual(responseData.completed, false, 'completed should be false');
  })
  .catch(error => {
    // Menangani kesalahan
    console.error('Error:', error.message);
  })
  .finally(() => {
    // Menjalankan tes
    ucuptest.runTests();
  });
