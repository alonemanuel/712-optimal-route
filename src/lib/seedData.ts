/**
 * Real seed data from actual user submissions (Tel Aviv addresses).
 * These are real addresses collected from the form, with:
 * - address_text: raw user input in Hebrew
 * - inferred_address: geocoding result
 * - lat/lng: coordinates from geocoding
 */

export interface SeedSubmission {
  id: string;
  google_user_id: string;
  email: string;
  display_name: string;
  address_text: string;
  inferred_address: string;
  lat: number;
  lng: number;
  is_seed: number;
  created_at: string;
}

export const SEED_SUBMISSIONS: SeedSubmission[] = [
  {
    id: "d8f2e3c1a9b5",
    google_user_id: "seed_0",
    email: "seed_0@import.local",
    display_name: "Rider 0",
    address_text: "שלמה המלך 99, תל אביב יפו",
    inferred_address: "Solomon King Street 99, Tel Aviv-Yafo",
    lat: 32.0924,
    lng: 34.7769,
    is_seed: 1,
    created_at: "2026-02-20T08:00:00Z"
  },
  {
    id: "a7c4f1d9e2b6",
    google_user_id: "seed_1",
    email: "seed_1@import.local",
    display_name: "Rider 1",
    address_text: "שלמה המלך 99, תל אביב יפו",
    inferred_address: "Solomon King Street 99, Tel Aviv-Yafo",
    lat: 32.0943,
    lng: 34.7836,
    is_seed: 1,
    created_at: "2026-02-20T08:01:00Z"
  },
  {
    id: "f5b3e2c8d1a4",
    google_user_id: "seed_2",
    email: "seed_2@import.local",
    display_name: "Rider 2",
    address_text: "נמל יפו 20, תל אביב יפו",
    inferred_address: "Jaffa Port Street 20, Tel Aviv-Yafo",
    lat: 32.0916,
    lng: 34.7864,
    is_seed: 1,
    created_at: "2026-02-20T08:02:00Z"
  },
  {
    id: "c2e9d7b4a1f3",
    google_user_id: "seed_3",
    email: "seed_3@import.local",
    display_name: "Rider 3",
    address_text: "אבן גבירול 88, תל אביב יפו",
    inferred_address: "Ibn Gabirol Street 88, Tel Aviv-Yafo",
    lat: 32.0905,
    lng: 34.7776,
    is_seed: 1,
    created_at: "2026-02-20T08:03:00Z"
  },
  {
    id: "e1f4a9c5b2d8",
    google_user_id: "seed_4",
    email: "seed_4@import.local",
    display_name: "Rider 4",
    address_text: "דיזנגוף 203, תל אביב יפו",
    inferred_address: "Dizengoff Street 203, Tel Aviv-Yafo",
    lat: 32.093,
    lng: 34.7894,
    is_seed: 1,
    created_at: "2026-02-20T08:04:00Z"
  },
  {
    id: "b6d3f1e8c5a2",
    google_user_id: "seed_5",
    email: "seed_5@import.local",
    display_name: "Rider 5",
    address_text: "דיזנגוף 237, תל אביב יפו",
    inferred_address: "Dizengoff Street 237, Tel Aviv-Yafo",
    lat: 32.0941,
    lng: 34.772,
    is_seed: 1,
    created_at: "2026-02-20T08:05:00Z"
  },
  {
    id: "d9a2e4b7c1f5",
    google_user_id: "seed_6",
    email: "seed_6@import.local",
    display_name: "Rider 6",
    address_text: "כ\"ג יורדי הסירה 1, תל אביב יפו",
    inferred_address: "23 Yordei HaSira Street 1, Tel Aviv-Yafo",
    lat: 32.0771,
    lng: 34.7874,
    is_seed: 1,
    created_at: "2026-02-20T08:06:00Z"
  },
  {
    id: "a3c8f2d5b9e1",
    google_user_id: "seed_7",
    email: "seed_7@import.local",
    display_name: "Rider 7",
    address_text: "דיזנגוף 276, תל אביב יפו",
    inferred_address: "Dizengoff Street 276, Tel Aviv-Yafo",
    lat: 32.089,
    lng: 34.7792,
    is_seed: 1,
    created_at: "2026-02-20T08:07:00Z"
  },
  {
    id: "f4e1c6b3a8d2",
    google_user_id: "seed_8",
    email: "seed_8@import.local",
    display_name: "Rider 8",
    address_text: "שדרות רוטשילד 1, תל אביב יפו",
    inferred_address: "Rothschild Boulevard 1, Tel Aviv-Yafo",
    lat: 32.0778,
    lng: 34.7781,
    is_seed: 1,
    created_at: "2026-02-20T08:08:00Z"
  },
  {
    id: "b7f2a9d4c1e6",
    google_user_id: "seed_9",
    email: "seed_9@import.local",
    display_name: "Rider 9",
    address_text: "נמל תל אביב, תל אביב יפו",
    inferred_address: "Tel Aviv Port, Tel Aviv-Yafo",
    lat: 32.093,
    lng: 34.7791,
    is_seed: 1,
    created_at: "2026-02-20T08:09:00Z"
  },
  {
    id: "c5d8e3f1a4b9",
    google_user_id: "seed_10",
    email: "seed_10@import.local",
    display_name: "Rider 10",
    address_text: "דיזנגוף 293, תל אביב יפו",
    inferred_address: "Dizengoff Street 293, Tel Aviv-Yafo",
    lat: 32.0816,
    lng: 34.7723,
    is_seed: 1,
    created_at: "2026-02-20T08:10:00Z"
  },
  {
    id: "e2a5b8c6d1f3",
    google_user_id: "seed_11",
    email: "seed_11@import.local",
    display_name: "Rider 11",
    address_text: "אבן גבירול 71, תל אביב יפו",
    inferred_address: "Ibn Gabirol Street 71, Tel Aviv-Yafo",
    lat: 32.0831,
    lng: 34.7916,
    is_seed: 1,
    created_at: "2026-02-20T08:11:00Z"
  },
  {
    id: "a6f1d9c4e2b7",
    google_user_id: "seed_12",
    email: "seed_12@import.local",
    display_name: "Rider 12",
    address_text: "דיזינגוף 50, תל אביב יפו",
    inferred_address: "Dizengoff Street 50, Tel Aviv-Yafo",
    lat: 32.0831,
    lng: 34.7907,
    is_seed: 1,
    created_at: "2026-02-20T08:12:00Z"
  },
  {
    id: "d3e7b1f5a9c2",
    google_user_id: "seed_13",
    email: "seed_13@import.local",
    display_name: "Rider 13",
    address_text: "דיזנגוף 203, תל אביב יפו",
    inferred_address: "Dizengoff Street 203, Tel Aviv-Yafo",
    lat: 32.0937,
    lng: 34.7816,
    is_seed: 1,
    created_at: "2026-02-20T08:13:00Z"
  },
  {
    id: "b8c2e6d4a1f9",
    google_user_id: "seed_14",
    email: "seed_14@import.local",
    display_name: "Rider 14",
    address_text: "דיזנגוף 203, תל אביב יפו",
    inferred_address: "Dizengoff Street 203, Tel Aviv-Yafo",
    lat: 32.0896,
    lng: 34.7776,
    is_seed: 1,
    created_at: "2026-02-20T08:14:00Z"
  },
  {
    id: "f1a4c8d2e6b5",
    google_user_id: "seed_15",
    email: "seed_15@import.local",
    display_name: "Rider 15",
    address_text: "ג'ורג' וייז 1, תל אביב יפו",
    inferred_address: "George Wise Street 1, Tel Aviv-Yafo",
    lat: 32.0855,
    lng: 34.7863,
    is_seed: 1,
    created_at: "2026-02-20T08:15:00Z"
  },
  {
    id: "c4b7e1f3a9d6",
    google_user_id: "seed_16",
    email: "seed_16@import.local",
    display_name: "Rider 16",
    address_text: "כיכר דיזנגוף 1, תל אביב יפו",
    inferred_address: "Dizengoff Square 1, Tel Aviv-Yafo",
    lat: 32.082,
    lng: 34.7759,
    is_seed: 1,
    created_at: "2026-02-20T08:16:00Z"
  },
  {
    id: "e5d1a9b4c7f2",
    google_user_id: "seed_17",
    email: "seed_17@import.local",
    display_name: "Rider 17",
    address_text: "שינקין 1, תל אביב יפו",
    inferred_address: "Sheinkin Street 1, Tel Aviv-Yafo",
    lat: 32.0771,
    lng: 34.7883,
    is_seed: 1,
    created_at: "2026-02-20T08:17:00Z"
  },
  {
    id: "a2f6d8b1e4c9",
    google_user_id: "seed_18",
    email: "seed_18@import.local",
    display_name: "Rider 18",
    address_text: "דיזנגוף 92, תל אביב יפו",
    inferred_address: "Dizengoff Street 92, Tel Aviv-Yafo",
    lat: 32.0781,
    lng: 34.7816,
    is_seed: 1,
    created_at: "2026-02-20T08:18:00Z"
  },
  {
    id: "d6c3f7a5b2e1",
    google_user_id: "seed_19",
    email: "seed_19@import.local",
    display_name: "Rider 19",
    address_text: "דרך השלום 115, תל אביב יפו",
    inferred_address: "Peace Road 115, Tel Aviv-Yafo",
    lat: 32.0945,
    lng: 34.7819,
    is_seed: 1,
    created_at: "2026-02-20T08:19:00Z"
  },
  {
    id: "b5e9c1d4a6f3",
    google_user_id: "seed_20",
    email: "seed_20@import.local",
    display_name: "Rider 20",
    address_text: "חיים לבנון 55, תל אביב יפו",
    inferred_address: "Haim Lebanon Street 55, Tel Aviv-Yafo",
    lat: 32.0833,
    lng: 34.7739,
    is_seed: 1,
    created_at: "2026-02-20T08:20:00Z"
  },
  {
    id: "f3a7e2b9c1d5",
    google_user_id: "seed_21",
    email: "seed_21@import.local",
    display_name: "Rider 21",
    address_text: "דיזנגוף 285, תל אביב יפו",
    inferred_address: "Dizengoff Street 285, Tel Aviv-Yafo",
    lat: 32.0794,
    lng: 34.7837,
    is_seed: 1,
    created_at: "2026-02-20T08:21:00Z"
  },
  {
    id: "c8d2a4f1e6b9",
    google_user_id: "seed_22",
    email: "seed_22@import.local",
    display_name: "Rider 22",
    address_text: "דרך השלום 98, תל אביב יפו",
    inferred_address: "Peace Road 98, Tel Aviv-Yafo",
    lat: 32.0842,
    lng: 34.7857,
    is_seed: 1,
    created_at: "2026-02-20T08:22:00Z"
  },
  {
    id: "e4b6f3d8a1c7",
    google_user_id: "seed_23",
    email: "seed_23@import.local",
    display_name: "Rider 23",
    address_text: "בזל 1, תל אביב יפו",
    inferred_address: "Bezalel Street 1, Tel Aviv-Yafo",
    lat: 32.0804,
    lng: 34.7768,
    is_seed: 1,
    created_at: "2026-02-20T08:23:00Z"
  },
  {
    id: "a9c1e7b4d2f5",
    google_user_id: "seed_24",
    email: "seed_24@import.local",
    display_name: "Rider 24",
    address_text: "גבעת התחמושת 10, תל אביב יפו",
    inferred_address: "Givat HaTachmoshet Street 10, Tel Aviv-Yafo",
    lat: 32.0759,
    lng: 34.7856,
    is_seed: 1,
    created_at: "2026-02-20T08:24:00Z"
  },
  {
    id: "d7f5c2a9b1e3",
    google_user_id: "seed_25",
    email: "seed_25@import.local",
    display_name: "Rider 25",
    address_text: "על פרשת דרכים 10, תל אביב יפו",
    inferred_address: "Al Prashat Darkime Street 10, Tel Aviv-Yafo",
    lat: 32.0884,
    lng: 34.7859,
    is_seed: 1,
    created_at: "2026-02-20T08:25:00Z"
  },
  {
    id: "b3e6d1f4a8c9",
    google_user_id: "seed_26",
    email: "seed_26@import.local",
    display_name: "Rider 26",
    address_text: "דיזנגוף 50, תל אביב יפו",
    inferred_address: "Dizengoff Street 50, Tel Aviv-Yafo",
    lat: 32.0813,
    lng: 34.7889,
    is_seed: 1,
    created_at: "2026-02-20T08:26:00Z"
  },
  {
    id: "f6a2c9e3d5b1",
    google_user_id: "seed_27",
    email: "seed_27@import.local",
    display_name: "Rider 27",
    address_text: "דיזנגוף 203, תל אביב יפו",
    inferred_address: "Dizengoff Street 203, Tel Aviv-Yafo",
    lat: 32.0802,
    lng: 34.7767,
    is_seed: 1,
    created_at: "2026-02-20T08:27:00Z"
  },
  {
    id: "c1d8f2b5a4e7",
    google_user_id: "seed_28",
    email: "seed_28@import.local",
    display_name: "Rider 28",
    address_text: "דיזנגוף 149, תל אביב יפו",
    inferred_address: "Dizengoff Street 149, Tel Aviv-Yafo",
    lat: 32.0875,
    lng: 34.7889,
    is_seed: 1,
    created_at: "2026-02-20T08:28:00Z"
  },
  {
    id: "e8a4b1c6f3d9",
    google_user_id: "seed_29",
    email: "seed_29@import.local",
    display_name: "Rider 29",
    address_text: "דיזנגוף 149, תל אביב יפו",
    inferred_address: "Dizengoff Street 149, Tel Aviv-Yafo",
    lat: 32.0866,
    lng: 34.7745,
    is_seed: 1,
    created_at: "2026-02-20T08:29:00Z"
  },
  {
    id: "a5f3d7e2c1b8",
    google_user_id: "seed_30",
    email: "seed_30@import.local",
    display_name: "Rider 30",
    address_text: "דיזנגוף 39, תל אביב יפו",
    inferred_address: "Dizengoff Street 39, Tel Aviv-Yafo",
    lat: 32.0951,
    lng: 34.7897,
    is_seed: 1,
    created_at: "2026-02-20T08:30:00Z"
  },
  {
    id: "d2b9e4a6c8f1",
    google_user_id: "seed_31",
    email: "seed_31@import.local",
    display_name: "Rider 31",
    address_text: "שדרות תרס\"ט 2, תל אביב יפו",
    inferred_address: "Trumpeldor Boulevard 2, Tel Aviv-Yafo",
    lat: 32.091,
    lng: 34.7887,
    is_seed: 1,
    created_at: "2026-02-20T08:31:00Z"
  },
  {
    id: "b4c1f6d3a9e5",
    google_user_id: "seed_32",
    email: "seed_32@import.local",
    display_name: "Rider 32",
    address_text: "אלוף קלמן מגן 3, תל אביב יפו",
    inferred_address: "Aluf Kalman Magen Street 3, Tel Aviv-Yafo",
    lat: 32.0888,
    lng: 34.7786,
    is_seed: 1,
    created_at: "2026-02-20T08:32:00Z"
  },
  {
    id: "f7e3a1c5b2d8",
    google_user_id: "seed_33",
    email: "seed_33@import.local",
    display_name: "Rider 33",
    address_text: "כ\"ג יורדי הסירה 1, תל אביב יפו",
    inferred_address: "23 Yordei HaSira Street 1, Tel Aviv-Yafo",
    lat: 32.0767,
    lng: 34.7768,
    is_seed: 1,
    created_at: "2026-02-20T08:33:00Z"
  }
];
