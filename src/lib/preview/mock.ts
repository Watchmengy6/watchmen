// Mock data for /preview/* screens — no backend needed.

export const mockMe = {
  id: "me",
  full_name: "Aaron Pilkington",
  email: "aaron@skyway.media",
  profile_photo_url: null as string | null,
  bio: "Founder at Skyway Media. Built for community and high-signal rooms.",
  occupation: "Founder",
  company: "Skyway Media",
  instagram_url: "https://instagram.com/aaron",
  interests: ["Marketing", "Tech", "Watches", "Entrepreneurship"],
  role: "super_admin" as const,
  status: "approved" as const,
  points_total: 1287,
  invited_by_user_id: null,
  invite_code: "wmn-aaron-7f2c",
  created_at: "2025-09-04T15:20:00Z",
  updated_at: "2026-05-22T15:20:00Z",
  last_active_at: "2026-05-25T13:11:00Z",
  phone: "+1 727 555 0142",
  birthday: "1989-07-14",
  membership_date: "2025-09-04",
  spouse: "Lauren",
  kids: "Cole (4), Ava (2)",
  venmo_username: "Aaron-Pilkington",
  cashapp_username: "aaronpilk",
  username: "aaron",
};

export const mockMembers = [
  {
    id: "p_dustin",
    full_name: "Dustin Hardy",
    profile_photo_url: null,
    occupation: "Founder",
    company: "Hardy Capital",
    points_total: 2310,
    interests: ["Investing", "Real estate", "Watches"],
    instagram_url: "https://instagram.com/dustin",
    bio: "Founder of The Watchman. Built businesses, raised four boys, runs the room.",
    venmo_username: "DustinHardy",
    cashapp_username: "dustinhardy",
    birthday: "1978-03-22",
    spouse: "Megan",
    kids: "Jack (12), Caleb (10), Beau (7), Knox (4)",
    membership_date: "2024-06-01",
    username: "dustin",
  },
  {
    id: "p_marcus",
    full_name: "Marcus Bell",
    profile_photo_url: null,
    occupation: "Realtor",
    company: "Coastal Bell Group",
    points_total: 1842,
    interests: ["Real estate", "Boating", "Golf"],
    instagram_url: "https://instagram.com/marcusbell",
    bio: "Selling Tampa Bay since 2014. Father of three.",
    venmo_username: "Marcus-Bell-12",
    cashapp_username: "marcusbell",
    birthday: "1985-11-08",
    spouse: "Sarah",
    kids: "Ella (8), Luke (6), Owen (3)",
    membership_date: "2024-06-12",
    username: "marcus",
  },
  {
    id: "p_jose",
    full_name: "Jose Ramirez",
    profile_photo_url: null,
    occupation: "GC",
    company: "Ramirez Build Co.",
    points_total: 1410,
    interests: ["Construction", "Fitness", "Church"],
    instagram_url: null,
    bio: "Building luxury homes on the gulf. Disciplined daily.",
    venmo_username: "Jose-Ramirez-Build",
    cashapp_username: "joseramirezbuild",
    birthday: "1983-05-30",
    spouse: "Maria",
    kids: "Sofia (10), Mateo (7)",
    membership_date: "2024-08-15",
    username: "jose",
  },
  {
    id: "p_tre",
    full_name: "Tre Mitchell",
    profile_photo_url: null,
    occupation: "Software Engineer",
    company: "Stripe",
    points_total: 1180,
    interests: ["Tech", "Cars", "Fitness"],
    instagram_url: "https://instagram.com/tre",
    bio: "Backend systems. Coffee snob. Recovering night owl.",
    venmo_username: "TreMitchell",
    cashapp_username: "tremitchell",
    birthday: "1991-09-14",
    spouse: null,
    kids: null,
    membership_date: "2024-11-02",
    username: "tre",
  },
  {
    id: "p_aaron",
    full_name: "Aaron Pilkington",
    profile_photo_url: null,
    occupation: "Founder",
    company: "Skyway Media",
    points_total: 1287,
    interests: ["Marketing", "Tech", "Watches", "Entrepreneurship"],
    instagram_url: "https://instagram.com/aaron",
    bio: "Founder at Skyway Media.",
    venmo_username: "Aaron-Pilkington",
    cashapp_username: "aaronpilk",
    birthday: "1989-07-14",
    spouse: "Lauren",
    kids: "Cole (4), Ava (2)",
    membership_date: "2025-09-04",
    username: "aaron",
  },
  {
    id: "p_chris",
    full_name: "Chris Watanabe",
    profile_photo_url: null,
    occupation: "Pastor",
    company: "Harborside Church",
    points_total: 980,
    interests: ["Church", "Networking", "Pickleball"],
    instagram_url: "https://instagram.com/chrisw",
    bio: "Pastoring people through real life. Pickleball junkie.",
    venmo_username: null,
    cashapp_username: null,
    birthday: "1980-12-03",
    spouse: "Hannah",
    kids: "Noah (9), Ezra (7), Eden (4)",
    membership_date: "2024-07-20",
    username: "chrisw",
  },
  {
    id: "p_devon",
    full_name: "Devon Park",
    profile_photo_url: null,
    occupation: "Wealth Advisor",
    company: "Park & Co.",
    points_total: 740,
    interests: ["Investing", "Business", "Golf"],
    instagram_url: null,
    bio: "Helping families think long-term about money.",
    venmo_username: "DevonPark",
    cashapp_username: "devonpark",
    birthday: "1987-04-19",
    spouse: "Jenna",
    kids: "Henry (5)",
    membership_date: "2025-01-14",
    username: "devon",
  },
];

export type EventCategory = "Dinner" | "Retreat" | "Mixer" | "Speaker" | "Service";
export type EventSource = "watchmen" | "sponsored";

export interface MockSponsoredEvent {
  id: string;
  title: string;
  description: string;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  location_name: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  image_url: string | null;
  rsvp_count: number;
  capacity: number;
  user_going: boolean;
  category: EventCategory;
  sponsor_name: string;
  sponsor_logo_url: string | null;
}

export const mockSponsoredEvents: MockSponsoredEvent[] = [
  {
    id: "sp_whiskey",
    title: "Bourbon Tasting · Heritage Hall",
    description:
      "Private tasting with the head distiller of Heritage Hall Bourbon. Six pours, six stories. Light food included.",
    event_date: "2026-06-19",
    start_time: "19:00:00",
    end_time: "22:00:00",
    location_name: "Heritage Hall Distillery",
    address: "888 9th St N, St. Petersburg, FL",
    latitude: 27.785,
    longitude: -82.645,
    image_url:
      "https://images.unsplash.com/photo-1568213816046-0ee1c42bd559?auto=format&fit=crop&w=1400&q=80",
    rsvp_count: 14,
    capacity: 30,
    user_going: false,
    category: "Mixer",
    sponsor_name: "Heritage Hall Bourbon",
    sponsor_logo_url: null,
  },
  {
    id: "sp_golf",
    title: "Eagle Open · Bay Pines",
    description:
      "Charity golf scramble. Foursomes only. $250/player, lunch + bar included. Watchman foursome reserved.",
    event_date: "2026-07-25",
    start_time: "07:30:00",
    end_time: "14:00:00",
    location_name: "Bay Pines Golf Club",
    address: "9445 Bay Pines Blvd, St. Petersburg, FL",
    latitude: 27.81,
    longitude: -82.78,
    image_url:
      "https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?auto=format&fit=crop&w=1400&q=80",
    rsvp_count: 8,
    capacity: 16,
    user_going: false,
    category: "Mixer",
    sponsor_name: "Bay Pines Country Club",
    sponsor_logo_url: null,
  },
  {
    id: "sp_summit",
    title: "Tampa Bay Founders Summit",
    description:
      "One-day summit with operators across Florida. Three keynotes, workshops, and 1:1 founder office hours.",
    event_date: "2026-09-12",
    start_time: "08:30:00",
    end_time: "18:00:00",
    location_name: "The Vinoy Resort",
    address: "501 5th Ave NE, St. Petersburg, FL",
    latitude: 27.781,
    longitude: -82.633,
    image_url:
      "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=1400&q=80",
    rsvp_count: 87,
    capacity: 200,
    user_going: true,
    category: "Speaker",
    sponsor_name: "Tampa Bay Founders Network",
    sponsor_logo_url: null,
  },
];

export const mockUpcomingEvent = {
  id: "ev_cigar_jun",
  title: "Watchman Cigar Night",
  description:
    "Rooftop, cigars, and an unhurried conversation about what's actually going well — and what's not. Bring a brother. Bring a story.",
  event_date: "2026-06-12",
  start_time: "19:30:00",
  end_time: "22:30:00",
  location_name: "Rooftop on Central",
  address: "215 Central Ave, St. Petersburg, FL",
  latitude: 27.7706,
  longitude: -82.6403,
  image_url:
    "https://images.unsplash.com/photo-1542843137-8791a6904d14?auto=format&fit=crop&w=1400&q=80",
  status: "published" as const,
  created_by_user_id: "p_dustin",
  created_at: "2026-05-10T00:00:00Z",
  updated_at: "2026-05-10T00:00:00Z",
  rsvp_count: 18,
  capacity: 25,
  user_going: true,
  category: "Mixer" as EventCategory,
};

export const mockEvents = [
  mockUpcomingEvent,
  {
    id: "ev_pickle",
    title: "Sunday Pickleball + Coffee",
    description: "Six courts booked. Doubles brackets. Coffee after.",
    event_date: "2026-06-21",
    start_time: "08:00:00",
    end_time: "10:30:00",
    location_name: "St. Pete Pickleball Club",
    address: "1500 4th St N, St. Petersburg, FL",
    latitude: 27.795,
    longitude: -82.638,
    image_url:
      "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=1200&q=80",
    status: "published" as const,
    created_by_user_id: "p_dustin",
    created_at: "2026-05-12T00:00:00Z",
    updated_at: "2026-05-12T00:00:00Z",
    rsvp_count: 11,
    capacity: 24,
    user_going: false,
    category: "Mixer" as EventCategory,
  },
  {
    id: "ev_dinner",
    title: "Founder's Dinner",
    description: "Private dinner. Eight seats. Topic: what you'd do with $10M.",
    event_date: "2026-07-09",
    start_time: "19:00:00",
    end_time: "22:00:00",
    location_name: "Locale Market",
    address: "179 2nd Ave N, St. Petersburg, FL",
    latitude: 27.773,
    longitude: -82.638,
    image_url:
      "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=80",
    status: "published" as const,
    created_by_user_id: "p_dustin",
    created_at: "2026-05-18T00:00:00Z",
    updated_at: "2026-05-18T00:00:00Z",
    rsvp_count: 6,
    capacity: 8,
    user_going: false,
    category: "Dinner" as EventCategory,
  },
  {
    id: "ev_retreat",
    title: "Annual Watchman Retreat",
    description: "Three nights at the cabin. Real conversations. No phones after sunset.",
    event_date: "2026-09-18",
    start_time: "15:00:00",
    end_time: "12:00:00",
    location_name: "Hardy Family Cabin",
    address: "Blue Ridge, GA",
    latitude: 34.864,
    longitude: -84.324,
    image_url:
      "https://images.unsplash.com/photo-1500994340878-40ce894df491?auto=format&fit=crop&w=1200&q=80",
    status: "published" as const,
    created_by_user_id: "p_dustin",
    created_at: "2026-05-20T00:00:00Z",
    updated_at: "2026-05-20T00:00:00Z",
    rsvp_count: 4,
    capacity: 16,
    user_going: true,
    category: "Retreat" as EventCategory,
  },
  {
    id: "ev_speaker",
    title: "Q&A with Pat Lencioni",
    description: "60-minute fireside on building real organizational health.",
    event_date: "2026-08-04",
    start_time: "18:00:00",
    end_time: "20:00:00",
    location_name: "St. Pete Yacht Club",
    address: "11 Central Ave, St. Petersburg, FL",
    latitude: 27.771,
    longitude: -82.633,
    image_url:
      "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=1200&q=80",
    status: "published" as const,
    created_by_user_id: "p_dustin",
    created_at: "2026-05-22T00:00:00Z",
    updated_at: "2026-05-22T00:00:00Z",
    rsvp_count: 32,
    capacity: 40,
    user_going: false,
    category: "Speaker" as EventCategory,
  },
];

export const mockPastEvent = {
  id: "ev_past_boat",
  title: "Saturday on the Bay",
  description: "Boats out from 9am. Brunch on the water.",
  event_date: "2026-04-26",
  start_time: "09:00:00",
  end_time: "14:00:00",
  location_name: "Vinoy Basin",
  address: "501 5th Ave NE, St. Petersburg, FL",
  latitude: 27.781,
  longitude: -82.633,
  image_url: null,
  status: "completed" as const,
  created_by_user_id: "p_dustin",
  created_at: "2026-04-01T00:00:00Z",
  updated_at: "2026-04-26T18:00:00Z",
  rsvp_count: 22,
  user_going: false,
};

export const mockMessages = [
  {
    id: "m1",
    chat_id: "main",
    user_id: "p_dustin",
    content: "Cigar night is locked in for the 12th. Bring the new guys.",
    media_url: null,
    media_type: "none" as const,
    created_at: "2026-05-25T12:14:00Z",
    updated_at: "2026-05-25T12:14:00Z",
    deleted_at: null,
    author: { full_name: "Dustin Hardy", profile_photo_url: null },
    reactions: [
      { reaction_type: "like", user_id: "p_marcus" },
      { reaction_type: "like", user_id: "p_aaron" },
      { reaction_type: "like", user_id: "p_tre" },
    ],
  },
  {
    id: "m2",
    chat_id: "main",
    user_id: "p_marcus",
    content: "I'm in. Bringing my buddy from Bradenton — he just sold his agency.",
    media_url: null,
    media_type: "none" as const,
    created_at: "2026-05-25T12:21:00Z",
    updated_at: "2026-05-25T12:21:00Z",
    deleted_at: null,
    author: { full_name: "Marcus Bell", profile_photo_url: null },
    reactions: [{ reaction_type: "like", user_id: "p_dustin" }],
  },
  {
    id: "m3",
    chat_id: "main",
    user_id: "p_aaron",
    content: "Send me his info Marcus — I'll get him an invite link.",
    media_url: null,
    media_type: "none" as const,
    created_at: "2026-05-25T12:23:00Z",
    updated_at: "2026-05-25T12:23:00Z",
    deleted_at: null,
    author: { full_name: "Aaron Pilkington", profile_photo_url: null },
    reactions: [],
  },
  {
    id: "m4",
    chat_id: "main",
    user_id: "p_jose",
    content: "Anyone want to run Sunday morning? 6am start, 4 miles.",
    media_url: null,
    media_type: "none" as const,
    created_at: "2026-05-25T13:02:00Z",
    updated_at: "2026-05-25T13:02:00Z",
    deleted_at: null,
    author: { full_name: "Jose Ramirez", profile_photo_url: null },
    reactions: [
      { reaction_type: "like", user_id: "p_tre" },
      { reaction_type: "like", user_id: "p_chris" },
    ],
  },
  {
    id: "m5",
    chat_id: "main",
    user_id: "p_chris",
    content: "I'm in for the run.",
    media_url: null,
    media_type: "none" as const,
    created_at: "2026-05-25T13:04:00Z",
    updated_at: "2026-05-25T13:04:00Z",
    deleted_at: null,
    author: { full_name: "Chris Watanabe", profile_photo_url: null },
    reactions: [],
  },
];

export const mockPoll = {
  id: "poll1",
  chat_id: "main",
  question: "Cigar night — where should we land?",
  created_by_user_id: "p_dustin",
  created_at: "2026-05-25T13:10:00Z",
  closes_at: null,
  options: [
    { id: "o1", option_text: "Rooftop on Central" },
    { id: "o2", option_text: "Hawkers private room" },
    { id: "o3", option_text: "My place — backyard" },
  ],
  votes: [
    { poll_option_id: "o1", user_id: "p_aaron" },
    { poll_option_id: "o1", user_id: "p_marcus" },
    { poll_option_id: "o1", user_id: "p_dustin" },
    { poll_option_id: "o3", user_id: "p_jose" },
    { poll_option_id: "o2", user_id: "p_chris" },
  ],
};

export const mockNotifications = [
  {
    id: "n1",
    user_id: "me",
    type: "invite_approved",
    title: "Your invite was approved",
    body: "Devon Park just joined The Watchman. +50 points.",
    read: false,
    created_at: "2026-05-25T11:00:00Z",
  },
  {
    id: "n2",
    user_id: "me",
    type: "event_published",
    title: "New event: Founder's Dinner",
    body: "Wednesday July 9. RSVP to lock your seat — only 8 available.",
    read: false,
    created_at: "2026-05-24T17:00:00Z",
  },
  {
    id: "n3",
    user_id: "me",
    type: "poll_created",
    title: "New poll in Main Room",
    body: "Cigar night — where should we land?",
    read: true,
    created_at: "2026-05-25T13:11:00Z",
  },
];

export const mockPending = [
  {
    id: "pend_1",
    full_name: "Hunter Cole",
    email: "hunter@coleboats.com",
    phone: "+1 727 555 8821",
    profile_photo_url: null,
    occupation: "Yacht broker",
    company: "Cole Marine",
    bio: "Selling boats, raising a son. Friend of Marcus.",
    instagram_url: "https://instagram.com/huntercole",
    interests: ["Boating", "Fishing", "Business"],
    inviter: { full_name: "Marcus Bell" },
    created_at: "2026-05-24T09:00:00Z",
  },
  {
    id: "pend_2",
    full_name: "Sam Okafor",
    email: "sam@okaforfit.com",
    phone: null,
    profile_photo_url: null,
    occupation: "Strength Coach",
    company: "Okafor Performance",
    bio: "Coaching pro athletes. Believer.",
    instagram_url: "https://instagram.com/sam.okafor",
    interests: ["Fitness", "Church", "Sports"],
    inviter: { full_name: "Jose Ramirez" },
    created_at: "2026-05-23T14:00:00Z",
  },
];

// ----- meetups (lightweight, member-created) -----
export type MeetupCategory = "Coffee" | "Workout" | "Drinks" | "Outdoors" | "Food" | "Other";

export interface MockMeetup {
  id: string;
  title: string;
  host_name: string;
  host_photo: string | null;
  when_iso: string;
  duration_min: number;
  location: string;
  attendees_going: number;
  user_going: boolean;
  notes: string;
  category: MeetupCategory;
  /** Tailwind gradient stops for the colored side strip / hero. */
  gradient: string;
  emoji: string;
  attendees_preview: { name: string; photo: string | null }[];
}

export const mockMeetups: MockMeetup[] = [
  {
    id: "mu_coffee",
    title: "Morning Coffee",
    host_name: "Marcus Bell",
    host_photo: null,
    when_iso: "2026-05-27T08:00:00Z",
    duration_min: 60,
    location: "Black Crow Coffee",
    attendees_going: 4,
    user_going: true,
    notes: "Coming up on a busy month — let's catch up before it kicks off.",
    category: "Coffee",
    gradient: "from-amber-500/25 via-amber-700/15 to-ink-900",
    emoji: "☕",
    attendees_preview: [
      { name: "Marcus Bell", photo: null },
      { name: "Aaron Pilkington", photo: null },
      { name: "Tre Mitchell", photo: null },
      { name: "Devon Park", photo: null },
    ],
  },
  {
    id: "mu_beers",
    title: "Friday Beers",
    host_name: "Tre Mitchell",
    host_photo: null,
    when_iso: "2026-05-29T17:30:00Z",
    duration_min: 120,
    location: "Hawkers Asian Street Food",
    attendees_going: 7,
    user_going: false,
    notes: "Outside seating. End of week wind-down. Bring a friend.",
    category: "Drinks",
    gradient: "from-rose-500/25 via-rose-700/15 to-ink-900",
    emoji: "🍻",
    attendees_preview: [
      { name: "Tre Mitchell", photo: null },
      { name: "Marcus Bell", photo: null },
      { name: "Dustin Hardy", photo: null },
    ],
  },
  {
    id: "mu_pickle",
    title: "Pickleball Doubles",
    host_name: "Chris Watanabe",
    host_photo: null,
    when_iso: "2026-05-28T18:00:00Z",
    duration_min: 90,
    location: "St. Pete Pickleball Club, Court 4",
    attendees_going: 3,
    user_going: false,
    notes: "Need one more for doubles. Court reserved.",
    category: "Workout",
    gradient: "from-emerald-500/25 via-emerald-700/15 to-ink-900",
    emoji: "🎾",
    attendees_preview: [
      { name: "Chris Watanabe", photo: null },
      { name: "Tre Mitchell", photo: null },
      { name: "Jose Ramirez", photo: null },
    ],
  },
  {
    id: "mu_walk",
    title: "Evening Walk + Talk",
    host_name: "Jose Ramirez",
    host_photo: null,
    when_iso: "2026-05-29T19:00:00Z",
    duration_min: 75,
    location: "North Shore Park",
    attendees_going: 6,
    user_going: true,
    notes: "Easy three-mile loop. Bring questions worth thinking through.",
    category: "Outdoors",
    gradient: "from-sky-500/25 via-sky-700/15 to-ink-900",
    emoji: "🌅",
    attendees_preview: [
      { name: "Jose Ramirez", photo: null },
      { name: "Aaron Pilkington", photo: null },
      { name: "Chris Watanabe", photo: null },
    ],
  },
  {
    id: "mu_lunch",
    title: "Saturday Lunch",
    host_name: "Devon Park",
    host_photo: null,
    when_iso: "2026-05-30T12:30:00Z",
    duration_min: 90,
    location: "The Library Restaurant",
    attendees_going: 5,
    user_going: false,
    notes: "Easy lunch. No agenda. Bringing my brother in from out of town.",
    category: "Food",
    gradient: "from-orange-500/25 via-orange-700/15 to-ink-900",
    emoji: "🍝",
    attendees_preview: [
      { name: "Devon Park", photo: null },
      { name: "Marcus Bell", photo: null },
    ],
  },
  {
    id: "mu_lift",
    title: "5:30 AM Lift",
    host_name: "Jose Ramirez",
    host_photo: null,
    when_iso: "2026-05-28T05:30:00Z",
    duration_min: 60,
    location: "Onnit Gym",
    attendees_going: 2,
    user_going: false,
    notes: "Push day. Anyone want to suffer with me?",
    category: "Workout",
    gradient: "from-lime-500/25 via-emerald-700/15 to-ink-900",
    emoji: "🏋️",
    attendees_preview: [
      { name: "Jose Ramirez", photo: null },
      { name: "Tre Mitchell", photo: null },
    ],
  },
];

// ----- groups -----
export type GroupCategory = "Fitness" | "Business" | "Hobby" | "Faith" | "Social" | "Sports";

export interface MockGroup {
  id: string;
  name: string;
  description: string;
  emoji: string;
  category: GroupCategory;
  /** Tailwind gradient stops for the colored side strip / hero. */
  gradient: string;
  member_count: number;
  members_preview: { name: string; photo: string | null }[];
  last_message: { author: string; content: string; created_at: string } | null;
  unread: number;
  joined: boolean;
  /** Rough "activity score" — used to surface most-active group as hero. */
  active_today: number;
}

export const mockGroups: MockGroup[] = [
  {
    id: "g_mastermind",
    name: "Business Mastermind",
    description: "Founders, operators, exits. Confidential.",
    emoji: "💼",
    category: "Business",
    gradient: "from-gold-500/30 via-gold-700/20 to-ink-900",
    member_count: 11,
    members_preview: [
      { name: "Dustin Hardy", photo: null },
      { name: "Aaron Pilkington", photo: null },
      { name: "Devon Park", photo: null },
      { name: "Marcus Bell", photo: null },
    ],
    last_message: {
      author: "Aaron",
      content: "Sharing my Q2 P&L for the meeting on Tuesday.",
      created_at: "2026-05-25T11:50:00Z",
    },
    unread: 4,
    joined: true,
    active_today: 18,
  },
  {
    id: "g_run",
    name: "Run Club",
    description: "Saturday mornings. 6am. Vinoy Park. Coffee after.",
    emoji: "🏃",
    category: "Fitness",
    gradient: "from-emerald-500/25 via-emerald-700/15 to-ink-900",
    member_count: 14,
    members_preview: [
      { name: "Tre Mitchell", photo: null },
      { name: "Jose Ramirez", photo: null },
      { name: "Aaron Pilkington", photo: null },
    ],
    last_message: {
      author: "Tre",
      content: "Anyone want to push for sub-7 pace this Saturday?",
      created_at: "2026-05-25T07:14:00Z",
    },
    unread: 2,
    joined: true,
    active_today: 9,
  },
  {
    id: "g_golf",
    name: "Golf Group",
    description: "Twice a month. Mix of public and private courses.",
    emoji: "⛳",
    category: "Hobby",
    gradient: "from-sky-500/25 via-sky-700/15 to-ink-900",
    member_count: 9,
    members_preview: [
      { name: "Marcus Bell", photo: null },
      { name: "Devon Park", photo: null },
      { name: "Dustin Hardy", photo: null },
    ],
    last_message: {
      author: "Marcus",
      content: "Renaissance booked for the 7th. 4 spots open.",
      created_at: "2026-05-24T18:02:00Z",
    },
    unread: 0,
    joined: true,
    active_today: 3,
  },
  {
    id: "g_cigars",
    name: "Cigars & Spirits",
    description: "Once a month. New spot every time.",
    emoji: "🥃",
    category: "Social",
    gradient: "from-rose-500/20 via-amber-700/15 to-ink-900",
    member_count: 22,
    members_preview: [
      { name: "Dustin Hardy", photo: null },
      { name: "Marcus Bell", photo: null },
      { name: "Devon Park", photo: null },
    ],
    last_message: {
      author: "Dustin",
      content: "Bringing the Padrons. Anyone got bourbon?",
      created_at: "2026-05-23T20:00:00Z",
    },
    unread: 0,
    joined: true,
    active_today: 1,
  },
  {
    id: "g_pickle",
    name: "Pickleball",
    description: "Tues + Thurs at the club. Doubles. Trash talk encouraged.",
    emoji: "🎾",
    category: "Sports",
    gradient: "from-lime-500/25 via-emerald-700/15 to-ink-900",
    member_count: 17,
    members_preview: [
      { name: "Chris Watanabe", photo: null },
      { name: "Tre Mitchell", photo: null },
      { name: "Jose Ramirez", photo: null },
    ],
    last_message: {
      author: "Chris",
      content: "Court 4 reserved tomorrow 6pm. Need one more.",
      created_at: "2026-05-25T12:30:00Z",
    },
    unread: 1,
    joined: false,
    active_today: 6,
  },
  {
    id: "g_bible",
    name: "Bible Study",
    description: "Tuesday mornings. Working through Proverbs.",
    emoji: "📖",
    category: "Faith",
    gradient: "from-violet-500/25 via-violet-700/15 to-ink-900",
    member_count: 8,
    members_preview: [
      { name: "Chris Watanabe", photo: null },
      { name: "Jose Ramirez", photo: null },
    ],
    last_message: {
      author: "Chris",
      content: "This week: Proverbs 27. \"Iron sharpens iron.\"",
      created_at: "2026-05-24T05:00:00Z",
    },
    unread: 0,
    joined: false,
    active_today: 2,
  },
];

// ----- direct messages -----
export interface MockDmThread {
  id: string;
  other_user_id: string;
  other_user_name: string;
  other_user_role: string | null;
  other_user_photo: string | null;
  last_message: { author_is_me: boolean; content: string; created_at: string };
  unread: number;
  online: boolean;
}

export const mockDmThreads: MockDmThread[] = [
  {
    id: "dm_dustin",
    other_user_id: "p_dustin",
    other_user_name: "Dustin Hardy",
    other_user_role: "Founder · Hardy Capital",
    other_user_photo: null,
    last_message: {
      author_is_me: false,
      content: "Glad to have you on. Let's get coffee this week.",
      created_at: "2026-05-25T12:14:00Z",
    },
    unread: 1,
    online: true,
  },
  {
    id: "dm_marcus",
    other_user_id: "p_marcus",
    other_user_name: "Marcus Bell",
    other_user_role: "Realtor · Coastal Bell Group",
    other_user_photo: null,
    last_message: {
      author_is_me: false,
      content: "Yo are you making it to the cigar night? Need to know for cigars.",
      created_at: "2026-05-25T11:48:00Z",
    },
    unread: 2,
    online: true,
  },
  {
    id: "dm_jose",
    other_user_id: "p_jose",
    other_user_name: "Jose Ramirez",
    other_user_role: "GC · Ramirez Build Co.",
    other_user_photo: null,
    last_message: {
      author_is_me: true,
      content: "5am Tuesday works for me. See you there.",
      created_at: "2026-05-25T09:20:00Z",
    },
    unread: 0,
    online: false,
  },
  {
    id: "dm_tre",
    other_user_id: "p_tre",
    other_user_name: "Tre Mitchell",
    other_user_role: "Engineer · Stripe",
    other_user_photo: null,
    last_message: {
      author_is_me: false,
      content: "Sent over the design doc. LMK what you think.",
      created_at: "2026-05-24T16:30:00Z",
    },
    unread: 0,
    online: false,
  },
  {
    id: "dm_devon",
    other_user_id: "p_devon",
    other_user_name: "Devon Park",
    other_user_role: "Wealth Advisor · Park & Co.",
    other_user_photo: null,
    last_message: {
      author_is_me: true,
      content: "Thanks brother. Catching up on it now.",
      created_at: "2026-05-23T21:14:00Z",
    },
    unread: 0,
    online: false,
  },
  {
    id: "dm_chris",
    other_user_id: "p_chris",
    other_user_name: "Chris Watanabe",
    other_user_role: "Pastor · Harborside Church",
    other_user_photo: null,
    last_message: {
      author_is_me: false,
      content: "Praying for you and Lauren this week.",
      created_at: "2026-05-22T08:00:00Z",
    },
    unread: 0,
    online: true,
  },
];

// One full sample DM conversation (with Marcus, asking about the cigar night)
export const mockDmConversation = [
  {
    id: "dmm1",
    chat_id: "dm_marcus",
    user_id: "p_marcus",
    content: "Yo. Are you making it to cigar night Thursday?",
    media_url: null,
    media_type: "none" as const,
    created_at: "2026-05-25T11:44:00Z",
    updated_at: "2026-05-25T11:44:00Z",
    author: { full_name: "Marcus Bell", profile_photo_url: null },
    reactions: [],
  },
  {
    id: "dmm2",
    chat_id: "dm_marcus",
    user_id: "p_marcus",
    content: "Trying to figure out how many cigars to bring.",
    media_url: null,
    media_type: "none" as const,
    created_at: "2026-05-25T11:44:30Z",
    updated_at: "2026-05-25T11:44:30Z",
    author: { full_name: "Marcus Bell", profile_photo_url: null },
    reactions: [],
  },
  {
    id: "dmm3",
    chat_id: "dm_marcus",
    user_id: "p_aaron",
    content: "Yeah I'm locked in. Bringing a brother from Bradenton too.",
    media_url: null,
    media_type: "none" as const,
    created_at: "2026-05-25T11:46:00Z",
    updated_at: "2026-05-25T11:46:00Z",
    author: { full_name: "Aaron Pilkington", profile_photo_url: null },
    reactions: [{ reaction_type: "like", user_id: "p_marcus" }],
  },
  {
    id: "dmm4",
    chat_id: "dm_marcus",
    user_id: "p_marcus",
    content: "Perfect. I'll plan for 25 total then. Need to know for cigars.",
    media_url: null,
    media_type: "none" as const,
    created_at: "2026-05-25T11:48:00Z",
    updated_at: "2026-05-25T11:48:00Z",
    author: { full_name: "Marcus Bell", profile_photo_url: null },
    reactions: [],
  },
];

// ----- social feed -----
export type FeedPostType = "post" | "job" | "need" | "meetup" | "event";

export interface MockFeedPost {
  id: string;
  user_id: string;
  user_name: string;
  user_role: string | null;
  user_photo: string | null;
  type: FeedPostType;
  content: string;
  image_url: string | null;
  created_at: string;
  likes: number;
  liked_by_me: boolean;
  comments: { id: string; user_name: string; user_photo: string | null; content: string; created_at: string }[];
  /** Optional: post is tagged to a group (chip shows on the card; group page surfaces it). */
  tagged_group?: { id: string; name: string; emoji: string; category: GroupCategory };
  /** Optional: post is an auto-generated reference to a meetup or event. */
  activity_ref?:
    | { kind: "meetup"; meetup_id: string }
    | { kind: "event"; event_id: string };
}

export const mockFeed: MockFeedPost[] = [
  {
    id: "f1",
    user_id: "p_dustin",
    user_name: "Dustin Hardy",
    user_role: "Founder · Hardy Capital",
    user_photo: null,
    type: "post",
    content:
      "Watchman dinner last night was something. Twelve guys around a table, three real conversations I couldn't have had at any networking event. Photos below — bring a brother next time.",
    image_url: null,
    created_at: "2026-05-25T08:14:00Z",
    likes: 23,
    liked_by_me: true,
    comments: [
      {
        id: "c1",
        user_name: "Marcus Bell",
        user_photo: null,
        content: "That table changed me. Already booked the rooftop for July.",
        created_at: "2026-05-25T08:30:00Z",
      },
      {
        id: "c2",
        user_name: "Jose Ramirez",
        user_photo: null,
        content: "Need to be there next one. Put me down.",
        created_at: "2026-05-25T08:42:00Z",
      },
    ],
  },
  {
    id: "f2",
    user_id: "p_marcus",
    user_name: "Marcus Bell",
    user_role: "Realtor · Coastal Bell Group",
    user_photo: null,
    type: "job",
    content:
      "Need a strong project manager. Mid-six figure salary. Hybrid in St. Pete. DM me if anyone in here is looking or knows someone solid. @aaron you mentioned a friend looking — connect us?",
    image_url: null,
    created_at: "2026-05-25T07:45:00Z",
    likes: 5,
    liked_by_me: false,
    comments: [],
  },
  {
    id: "f3",
    user_id: "p_jose",
    user_name: "Jose Ramirez",
    user_role: "GC · Ramirez Build Co.",
    user_photo: null,
    type: "post",
    content:
      "First framing on the gulf project. Two years of work to get here.",
    image_url:
      "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1200&q=80",
    created_at: "2026-05-24T15:20:00Z",
    likes: 41,
    liked_by_me: true,
    comments: [
      {
        id: "c3",
        user_name: "Dustin Hardy",
        user_photo: null,
        content: "Brother. This is huge.",
        created_at: "2026-05-24T15:40:00Z",
      },
    ],
    tagged_group: { id: "g_mastermind", name: "Business Mastermind", emoji: "💼", category: "Business" },
  },
  {
    id: "f4",
    user_id: "p_chris",
    user_name: "Chris Watanabe",
    user_role: "Pastor · Harborside Church",
    user_photo: null,
    type: "need",
    content:
      "Looking for a guy with sound system experience for our youth conference next month. Volunteer or paid, whichever works. PM me.",
    image_url: null,
    created_at: "2026-05-24T11:30:00Z",
    likes: 8,
    liked_by_me: false,
    comments: [
      {
        id: "c4",
        user_name: "Tre Mitchell",
        user_photo: null,
        content: "I can help — got a buddy at Eikon.",
        created_at: "2026-05-24T11:51:00Z",
      },
    ],
  },
  {
    id: "f_meetup_beers",
    user_id: "p_tre",
    user_name: "Tre Mitchell",
    user_role: "Engineer · Stripe",
    user_photo: null,
    type: "meetup",
    content: "End of week wind-down. Bring a friend.",
    image_url: null,
    created_at: "2026-05-25T10:00:00Z",
    likes: 3,
    liked_by_me: false,
    comments: [],
    activity_ref: { kind: "meetup", meetup_id: "mu_beers" },
  },
  {
    id: "f_meetup_walk",
    user_id: "p_jose",
    user_name: "Jose Ramirez",
    user_role: "GC · Ramirez Build Co.",
    user_photo: null,
    type: "meetup",
    content: "Easy three-mile loop. Bring questions worth thinking through.",
    image_url: null,
    created_at: "2026-05-25T07:30:00Z",
    likes: 6,
    liked_by_me: true,
    comments: [
      {
        id: "c_walk",
        user_name: "Aaron Pilkington",
        user_photo: null,
        content: "I'm in.",
        created_at: "2026-05-25T07:45:00Z",
      },
    ],
    activity_ref: { kind: "meetup", meetup_id: "mu_walk" },
  },
  {
    id: "f5",
    user_id: "p_tre",
    user_name: "Tre Mitchell",
    user_role: "Engineer · Stripe",
    user_photo: null,
    type: "post",
    content: "Run club Saturday, 6am, Vinoy Park. Four-mile loop. Coffee after. Who's in.",
    image_url: null,
    created_at: "2026-05-24T09:00:00Z",
    likes: 14,
    liked_by_me: false,
    comments: [
      {
        id: "c5",
        user_name: "Jose Ramirez",
        user_photo: null,
        content: "In.",
        created_at: "2026-05-24T09:03:00Z",
      },
      {
        id: "c6",
        user_name: "Aaron Pilkington",
        user_photo: null,
        content: "Count me in.",
        created_at: "2026-05-24T09:11:00Z",
      },
    ],
    tagged_group: { id: "g_run", name: "Run Club", emoji: "🏃", category: "Fitness" },
  },
];

export const mockLedger = [
  { user_id: "p_marcus", user_name: "Marcus Bell", action_type: "invite_approved", points: 50, created_at: "2026-05-25T11:00:00Z" },
  { user_id: "p_aaron", user_name: "Aaron Pilkington", action_type: "check_in", points: 25, created_at: "2026-05-24T19:30:00Z" },
  { user_id: "p_dustin", user_name: "Dustin Hardy", action_type: "poll_created", points: 3, created_at: "2026-05-25T13:10:00Z" },
  { user_id: "p_tre", user_name: "Tre Mitchell", action_type: "message_image", points: 3, created_at: "2026-05-25T10:14:00Z" },
  { user_id: "p_jose", user_name: "Jose Ramirez", action_type: "rsvp_going", points: 5, created_at: "2026-05-22T08:11:00Z" },
];
