import { describe, it, expect, vi, beforeEach } from "vitest";

// Columns that were revoked from `authenticated` on public.profiles. The
// WhosWhoQuiz client query MUST NOT request any of these — cross-user reads of
// these fields are only permitted through the view-profile / discover-profiles
// edge functions (service_role).
const REVOKED_COLUMNS = [
  "weight_kg",
  "political_beliefs",
  "religion",
  "ethnicity",
  "nationality",
  "non_negotiables",
  "voice_intro_url",
];

// Capture the exact column list passed to supabase.from("profiles").select(...).
let capturedSelect: string | null = null;

vi.mock("@/integrations/supabase/client", () => {
  const inFn = vi.fn(() => Promise.resolve({ data: [], error: null }));
  const selectFn = vi.fn((cols: string) => {
    capturedSelect = cols;
    return { in: inFn };
  });
  const fromFn = vi.fn(() => ({ select: selectFn }));
  return { supabase: { from: fromFn } };
});

import { generateWhosWhoQuestions, WHOS_WHO_TOTAL_ROUNDS } from "./WhosWhoQuiz";

beforeEach(() => {
  capturedSelect = null;
});

describe("WhosWhoQuiz data shape", () => {
  it("does not request any revoked sensitive columns from public.profiles", async () => {
    await generateWhosWhoQuestions("user-a", "user-b");
    expect(capturedSelect).not.toBeNull();
    const requested = capturedSelect!.split(",").map((c) => c.trim());
    for (const col of REVOKED_COLUMNS) {
      expect(
        requested,
        `WhosWhoQuiz must not request revoked column "${col}" — route it through view-profile instead`,
      ).not.toContain(col);
    }
  });

  it("renders no questions referencing revoked columns even if the server returns them", async () => {
    // Simulate the server (hypothetically) leaking revoked fields — the quiz
    // generator must not use them, so no question text should mention their
    // values.
    const { supabase } = await import("@/integrations/supabase/client");
    (supabase.from as any).mockImplementationOnce(() => ({
      select: (cols: string) => {
        capturedSelect = cols;
        return {
          in: () =>
            Promise.resolve({
              data: [
                {
                  user_id: "user-a",
                  display_name: "Alice",
                  occupation: "Engineer",
                  bio: "hi",
                  interests: [],
                  favourite_music: [],
                  favourite_sport: [],
                  favourite_hobbies: [],
                  favourite_film: [],
                  // Leaked sensitive fields — quiz must ignore them.
                  religion: "SECRET_RELIGION_VALUE",
                  nationality: "SECRET_NATIONALITY_VALUE",
                  ethnicity: "SECRET_ETHNICITY_VALUE",
                  political_beliefs: "SECRET_POLITICS_VALUE",
                  weight_kg: 9999,
                  non_negotiables: ["SECRET_DEALBREAKER"],
                  voice_intro_url: "SECRET_VOICE_URL",
                },
                {
                  user_id: "user-b",
                  display_name: "Bob",
                  occupation: "Designer",
                  bio: "hey",
                  interests: [],
                  favourite_music: [],
                  favourite_sport: [],
                  favourite_hobbies: [],
                  favourite_film: [],
                  religion: "OTHER_SECRET",
                  nationality: "OTHER_SECRET",
                  ethnicity: "OTHER_SECRET",
                  political_beliefs: "OTHER_SECRET",
                  weight_kg: 1,
                  non_negotiables: ["OTHER_SECRET"],
                  voice_intro_url: "OTHER_SECRET",
                },
              ],
              error: null,
            }),
        };
      },
    }));

    const questions = await generateWhosWhoQuestions("user-a", "user-b");
    expect(questions.length).toBeLessThanOrEqual(WHOS_WHO_TOTAL_ROUNDS);
    const forbidden = ["SECRET_RELIGION_VALUE", "SECRET_NATIONALITY_VALUE", "SECRET_ETHNICITY_VALUE", "SECRET_POLITICS_VALUE", "SECRET_DEALBREAKER", "SECRET_VOICE_URL", "9999"];
    for (const q of questions) {
      for (const bad of forbidden) {
        expect(q.questionText).not.toContain(bad);
      }
    }
  });
});
