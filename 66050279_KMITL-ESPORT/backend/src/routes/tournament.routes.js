import express from 'express';
import {
    getAllTournaments,
    getTournamentById,
    getTournamentMatches,
} from '../controllers/tournament.controller.js';

const tournamentRoute = express.Router();

// GET /tournaments
tournamentRoute.get('/', getAllTournaments);

// GET /tournaments/:id
tournamentRoute.get('/:id', getTournamentById);

// GET /tournaments/:id/matches
tournamentRoute.get('/:id/matches', getTournamentMatches);

export default tournamentRoute;
