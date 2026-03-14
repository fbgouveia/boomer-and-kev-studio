export type CalendarEvent = {
    id: string;
    name: string;
    date: string; // ISO-like MM-DD or approximate
    category: 'SPORT' | 'CULTURE' | 'HOLIDAY';
    boomerTake: string; // What Boomer yells about
    kevTake: string;    // What Kev ignores
};

export const AUSSIE_CALENDAR: CalendarEvent[] = [
    // JANUARY
    {
        id: 'NYD',
        name: "New Year's Day",
        date: '01-01',
        category: 'HOLIDAY',
        boomerTake: "NEW YEAR, NEW ME! I'm doing 1000 burpees before breakfast!",
        kevTake: "New year, same headache. Keep it down."
    },
    {
        id: 'AUS_OPEN',
        name: "Australian Open",
        date: '01-15',
        category: 'SPORT',
        boomerTake: "It's 40 degrees on the court! That's what I call a warm-up!",
        kevTake: "Wake me up when they stop grunting."
    },
    {
        id: 'AUS_DAY',
        name: "Australia Day",
        date: '01-26',
        category: 'HOLIDAY',
        boomerTake: "Double thongs, double flags, double BBQ! Let's go!",
        kevTake: "Too hot. Too loud. I'm staying in the AC."
    },
    // FEBRUARY
    {
        id: 'SUPER_BOWL',
        name: "Super Bowl (Aussie Edition)",
        date: '02-12',
        category: 'SPORT',
        boomerTake: "It's not League, but the halftime show is pure adrenaline!",
        kevTake: "It's 4 hours of ads and 10 minutes of football. Pass."
    },
    // MARCH
    {
        id: 'NRL_START',
        name: "NRL Season Kickoff",
        date: '03-02',
        category: 'SPORT',
        boomerTake: "FOOTY IS BACK! UP THE BRONCOS! UP THE DOLPHINS!",
        kevTake: "Great. 26 weeks of you shouting at the TV."
    },
    {
        id: 'F1_MELB',
        name: "F1 Grand Prix",
        date: '03-24',
        category: 'SPORT',
        boomerTake: "Fast cars, loud noises! That's my meditation music!",
        kevTake: "They're just driving in circles, Boomer. It's pointless."
    },
    // APRIL
    {
        id: 'ANZAC',
        name: "Anzac Day",
        date: '04-25',
        category: 'HOLIDAY',
        boomerTake: "Two-up at the RSL! Respect the legends! Heads or tails!",
        kevTake: "It's about respect, mate. And quiet reflection. Try it."
    },
    // MAY
    {
        id: 'STATE_OF_ORIGIN_1',
        name: "State of Origin I",
        date: '05-31',
        category: 'SPORT',
        boomerTake: "QUEENSLANDER! If you aren't wearing Maroon, get out of my studio!",
        kevTake: "Oh look, grown men tackling each other. Cultural peak."
    },
    // JULY
    {
        id: 'STATE_OF_ORIGIN_3',
        name: "State of Origin III (Decider)",
        date: '07-12',
        category: 'SPORT',
        boomerTake: "IT ALL COMES DOWN TO THIS! BLOOD ON THE JERSEY!",
        kevTake: "Is it over yet? The shouting is vibrating my eucalyptus."
    },
    // AUGUST
    {
        id: 'EKKA',
        name: "Brisbane Ekka",
        date: '08-14',
        category: 'CULTURE',
        boomerTake: "Dagwood dogs and showbags! It's pure protein... sort of!",
        kevTake: "It's just flu virus in a showbag. I'm staying home."
    },
    // SEPTEMBER
    {
        id: 'AFL_GF',
        name: "AFL Grand Final",
        date: '09-30',
        category: 'SPORT',
        boomerTake: "Aerial ping-pong at its finest! Look at those marks!",
        kevTake: "Why are they wearing tight shorts? It's disturbing."
    },
    {
        id: 'NRL_GF',
        name: "NRL Grand Final",
        date: '10-01',
        category: 'SPORT',
        boomerTake: "The holy grail! This is better than Christmas!",
        kevTake: "Finally. The season ends. I can sleep again."
    },
    // OCTOBER
    {
        id: 'BATHURST',
        name: "Bathurst 1000",
        date: '10-08',
        category: 'SPORT',
        boomerTake: "King of the Mountain! V8 roaring! Smell that petrol!",
        kevTake: "1000 kilometers of noise. Sounds like a nightmare."
    },
    // NOVEMBER
    {
        id: 'MELB_CUP',
        name: "Melbourne Cup",
        date: '11-05',
        category: 'CULTURE',
        boomerTake: "The race that stops the nation! I've got a pony in the sweep!",
        kevTake: "The race that stops me from napping. No thanks."
    },
    {
        id: 'CRICKET_SUMMER',
        name: "The Ashes / Summer Cricket",
        date: '11-20',
        category: 'SPORT',
        boomerTake: "Pumping fast balls down the pitch! Howzat!",
        kevTake: "Test cricket. 5 days of standing in a field. Riveting."
    },
    // DECEMBER
    {
        id: 'XMAS',
        name: "Christmas",
        date: '12-25',
        category: 'HOLIDAY',
        boomerTake: "Backyard cricket and prawns! I'm bowling bouncers at ply grandmas!",
        kevTake: "Wake me up when the food is ready."
    },
    {
        id: 'BOXING_DAY',
        name: "Boxing Day Test",
        date: '12-26',
        category: 'SPORT',
        boomerTake: "Leftover ham and cricket! The breakfast of champions!",
        kevTake: "Leftovers and sleep. The only good day of the year."
    }
];

export const getUpcomingEvent = (): CalendarEvent | null => {
    const today = new Date();
    const currentMonth = today.getMonth() + 1; // 0-indexed
    const currentDay = today.getDate();

    // Convert "MM-DD" to comparable number MMDD
    const todayNum = currentMonth * 100 + currentDay;

    // Find first event strictly after today
    const nextEvent = AUSSIE_CALENDAR.find(e => {
        const [m, d] = e.date.split('-').map(Number);
        const eventNum = m * 100 + d;
        return eventNum >= todayNum;
    });

    // If no event left this year, loop to first of next year
    return nextEvent || AUSSIE_CALENDAR[0];
};
