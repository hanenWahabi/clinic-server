const axios = require('axios');

async function testLogin() {
    try {
        const response = await axios.post('http://192.168.1.19:8089/api/auth/login', {
            email: 'test@example.com',
            password: 'Test123!@#'
        });
        console.log('Réponse:', response.data);
    } catch (error) {
        console.error('Erreur:', error.response ? error.response.data : error.message);
    }
}

testLogin();
