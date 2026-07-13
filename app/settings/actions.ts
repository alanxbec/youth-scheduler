"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateCm } from "@/lib/cm";
import { timeToMin } from "@/lib/slots";

export interface SettingsState {
  saved?: boolean;
  error?: string;
}

const BUFFERS = [0, 15, 30, 45, 60];
const SLOTS = [15, 20, 30, 45, 60];

export async function updateSettings(
  _prev: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Not signed in." };
    const cm = await getOrCreateCm(supabase, user);

    const name = String(formData.get("name") ?? "").trim();
    const workStart = String(formData.get("work_start") ?? "");
    const workEnd = String(formData.get("work_end") ?? "");
    const bufferMinutes = Number(formData.get("buffer_minutes"));
    const slotMinutes = Number(formData.get("slot_minutes"));

    if (name.length < 1 || name.length > 80) return { error: "Please enter your name." };
    if (!/^\d{2}:\d{2}$/.test(workStart) || !/^\d{2}:\d{2}$/.test(workEnd))
      return { error: "Please set both working hours." };
    if (timeToMin(workStart) >= timeToMin(workEnd))
      return { error: "The day must start before it ends." };
    if (!BUFFERS.includes(bufferMinutes)) return { error: "Pick a buffer from the list." };
    if (!SLOTS.includes(slotMinutes)) return { error: "Pick a slot length from the list." };

    const { error } = await supabase
      .from("case_managers")
      .update({
        name,
        work_start: workStart,
        work_end: workEnd,
        buffer_minutes: bufferMinutes,
        slot_minutes: slotMinutes,
      })
      .eq("id", cm.id);
    if (error) return { error: error.message };

    revalidatePath("/settings");
    revalidatePath("/dashboard");
    return { saved: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }
}
