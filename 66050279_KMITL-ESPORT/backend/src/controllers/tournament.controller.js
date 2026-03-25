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
