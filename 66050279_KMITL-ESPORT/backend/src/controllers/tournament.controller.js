import prisma from '../config/db.js';

export const getAllTournaments = async (req, res) => {
    try {
        const tournaments = await prisma.tournament.findMany({
            include: {
                _count: { select: { applications: true } },
            },
            orderBy: { start_date: 'asc' },
        });
        return res.status(200).json(tournaments);
    } catch (error) {
        console.error('getAllTournaments error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export const getTournamentById = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const tournament = await prisma.tournament.findUnique({
            where: { tournament_id: id },
            include: {
                _count: { select: { applications: true } },
                applications: {
                    include: { team: true },
                },
            },
        });
        if (!tournament) {
            return res.status(404).json({ message: 'Tournament not found' });
        }
        return res.status(200).json(tournament);
    } catch (error) {
        console.error('getTournamentById error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export const getTournamentMatches = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const matches = await prisma.match.findMany({
            where: { tournament_id: id },
            orderBy: [{ round: 'asc' }, { position: 'asc' }],
        });
        return res.status(200).json(matches);
    } catch (error) {
        console.error('getTournamentMatches error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export const updateMatchScore = async (req, res) => {
    try {
        const matchId = parseInt(req.params.matchId);
        const { score1, score2 } = req.body;

        const match = await prisma.match.findUnique({ where: { match_id: matchId } });
        if (!match) return res.status(404).json({ error: 'Match not found' });

        const updated = await prisma.match.update({
            where: { match_id: matchId },
            data: { score1, score2 },
        });
        return res.status(200).json(updated);
    } catch (error) {
        console.error('updateMatchScore error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

export const saveAllMatches = async (req, res) => {
    try {
        const tournamentId = parseInt(req.params.tournamentId);
        const { matches } = req.body;

        if (!Array.isArray(matches)) {
            return res.status(400).json({ message: 'matches must be an array' });
        }

        // Delete existing matches then recreate to reflect current bracket state
        await prisma.match.deleteMany({ where: { tournament_id: tournamentId } });

        await prisma.match.createMany({
            data: matches.map((m) => ({
                tournament_id: tournamentId,
                team1_name: m.team1_name || null,
                team2_name: m.team2_name || null,
                score1: m.score1 !== undefined && m.score1 !== '' ? m.score1 : null,
                score2: m.score2 !== undefined && m.score2 !== '' ? m.score2 : null,
                round: m.round,
                position: m.position,
            })),
        });

        const newMatches = await prisma.match.findMany({
            where: { tournament_id: tournamentId },
            orderBy: [{ round: 'asc' }, { position: 'asc' }],
        });

        return res.status(200).json({ matches: newMatches });
    } catch (error) {
        console.error('saveAllMatches error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
