const request = require('request');
const assert = require('assert');

const baseUrl = 'http://192.168.1.19:8089/api/auth';
const testUser = {
    email: 'test@example.com',
    password: 'Test123!@#',
    role: 'patient',
    firstName: 'Test',
    lastName: 'User'
};

// Test d'inscription
request.post({
    url: `${baseUrl}/register`,
    json: true,
    body: testUser
}, (error, response, body) => {
    if (error) throw error;
    console.log('Test d\'inscription:', body);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.message, 'Inscription réussie');
    assert.ok(body.token);
    assert.strictEqual(body.user.email, testUser.email);
});

// Test de connexion
request.post({
    url: `${baseUrl}/login`,
    json: true,
    body: {
        email: testUser.email,
        password: testUser.password
    }
}, (error, response, body) => {
    if (error) throw error;
    console.log('Test de connexion:', body);
    assert.strictEqual(body.success, true);
    assert.ok(body.token);
    assert.strictEqual(body.user.email, testUser.email);
});

// Test de réinitialisation du mot de passe
request.post({
    url: `${baseUrl}/request`,
    json: true,
    body: {
        email: testUser.email
    }
}, (error, response, body) => {
    if (error) throw error;
    console.log('Test de réinitialisation:', body);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.message, 'Un email de réinitialisation a été envoyé');
});
