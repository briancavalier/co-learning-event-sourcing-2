
type LeaderboardEvent = LeaderboardCreated | LeaderboardWon | UserExercised | UserJoined | UserJoinedFailed

type LeaderboardCreated = {
    type: 'leaderboard-created'
    leaderboardId: string
    name: string
    description: string,
    goal: number // minutes of elevated heart rate
    timestamp: number
}

type LeaderboardWon = {
    type: 'leaderboard-won'
    leaderboardId: string
    winnerId: string
    timestamp: number
}

type UserExercised = {
    type: 'user-exercised'
    userId: string
    minutes: number
    timestamp: number
}

type UserJoined = {
    type: 'user-joined'
    userId: string
    leaderboardId: string
    timestamp: number
}

type UserJoinedFailed = {
    type: 'user-joined-failed'
    userId: string
    leaderboardId: string
    reason: string
    timestamp: number
}

type EventStore<A> = A[]

const putEvent = <A>(eventStore: EventStore<A>, event: A): void => {
    eventStore.push(event)
}

const getEvents = <A>(eventStore: EventStore<A>): readonly A[] => {
    return eventStore
}

const usersOnLeaderboard = (eventStore: EventStore<LeaderboardEvent>, leaderboardId: string): Set<string> => {
    const users = new Set<string>()
    for (const event of eventStore) {
        if (event.type === 'user-joined' && event.leaderboardId === leaderboardId) {
            users.add(event.userId)
        }
    }
    return users
}

type UserOnLeaderboard = {
    userId: string
    minutes: number
}

const getLeaderboardUsersRanked = (eventStore: EventStore<LeaderboardEvent>, leaderboardId: string): UserOnLeaderboard[] => {
    const users = usersOnLeaderboard(eventStore, leaderboardId)
    const ranked = new Map<string, number>()
    for (const event of eventStore) {
        if (event.type === 'user-exercised' && users.has(event.userId)) {
            const r = ranked.get(event.userId) ?? 0
            ranked.set(event.userId, r + event.minutes)
        }
    }

    return [...ranked.entries()].map(([userId, minutes]) => ({ userId, minutes })).sort((a, b) => b.minutes - a.minutes)
}

const isOpen = (eventStore: EventStore<LeaderboardEvent>, leaderboardId: string): boolean =>
    !(getEvents(eventStore)).find(e => e.type === 'leaderboard-won' && e.leaderboardId === leaderboardId)

const joinLeaderboard = (eventStore: EventStore<LeaderboardEvent>, userId: string, leaderboardId: string): void => {
    const users = usersOnLeaderboard(eventStore, leaderboardId)
    if (!isOpen(eventStore, leaderboardId)) {
        return putEvent(eventStore, {
            type: 'user-joined-failed',
            userId,
            leaderboardId,
            reason: 'Leaderboard is closed',
            timestamp: Date.now()
        })
    }
    if (users.has(userId)) {
        return putEvent(eventStore, {
            type: 'user-joined-failed',
            userId,
            leaderboardId,
            reason: 'User already joined',
            timestamp: Date.now()
        })
    }
    return putEvent(eventStore, {
        type: 'user-joined',
        userId,
        leaderboardId,
        timestamp: Date.now()
    })
}


const eventStore: EventStore<LeaderboardEvent> = []

putEvent(eventStore, {
    type: 'leaderboard-created',
    leaderboardId: '1',
    name: 'Leaderboard 1',
    description: 'Description 1',
    goal: 100,
    timestamp: Date.now()
})

joinLeaderboard(eventStore, 'user-1', '1')
joinLeaderboard(eventStore, 'user-2', '1')

putEvent(eventStore, {
    type: 'user-exercised',
    userId: 'user-1',
    minutes: 50,
    timestamp: Date.now()
})

putEvent(eventStore, {
    type: 'user-exercised',
    userId: 'user-2',
    minutes: 60,
    timestamp: Date.now()
})

putEvent(eventStore, {
    type: 'user-exercised',
    userId: 'user-1',
    minutes: 50,
    timestamp: Date.now()
})

joinLeaderboard(eventStore, 'user-1', '1')


console.log(getLeaderboardUsersRanked(eventStore, '1'), usersOnLeaderboard(eventStore, '1'), getEvents(eventStore))