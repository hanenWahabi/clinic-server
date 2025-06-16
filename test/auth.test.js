const request = require('supertest');
const app = require('../server');
const mongoose = require('mongoose');
const User = require('../models/user');

// Configuration de test
describe('Auth API Tests', () => {
    let server;
    const testUser = {
        email: 'test@example.com',
        password: 'Test123!@#',
        role: 'patient',
        firstName: 'Test',
        lastName: 'User'
    };

    beforeAll(async () => {
        // Démarrer le serveur
        server = app.listen(8089);
        
        // Effacer les données de test
        await User.deleteMany({});
    });

    afterAll(async () => {
        // Arrêter le serveur
        server.close();
        
        // Effacer les données de test
        await User.deleteMany({});
    });

    // Tests d'inscription
    describe('POST /api/auth/register', () => {
        it('devrait inscrire un nouvel utilisateur', async () => {
            const response = await request(app)
                .post('/api/auth/register')
                .send(testUser)
                .expect(201);

            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('message', 'Inscription réussie');
            expect(response.body).toHaveProperty('token');
            expect(response.body.user).toHaveProperty('email', testUser.email);
        });

        it('devrait échouer avec un email déjà utilisé', async () => {
            const response = await request(app)
                .post('/api/auth/register')
                .send(testUser)
                .expect(400);

            expect(response.body).toHaveProperty('message', 'Email déjà utilisé');
        });
    });

    // Tests de connexion
    describe('POST /api/auth/login', () => {
        it('devrait connecter un utilisateur existant', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: testUser.email,
                    password: testUser.password
                })
                .expect(200);

            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('token');
            expect(response.body.user).toHaveProperty('email', testUser.email);
        });

        it('devrait échouer avec un mauvais mot de passe', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: testUser.email,
                    password: 'wrongpassword'
                })
                .expect(401);

            expect(response.body).toHaveProperty('message', 'Email ou mot de passe incorrect');
        });
    });

    // Tests de réinitialisation du mot de passe
    describe('POST /api/auth/request', () => {
        it('devrait envoyer un email de réinitialisation', async () => {
            const response = await request(app)
                .post('/api/auth/request')
                .send({
                    email: testUser.email
                })
                .expect(200);

            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('message', 'Un email de réinitialisation a été envoyé');
        });
    });
});
