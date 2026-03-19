import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useFoundingUserSlots = () => {
  const [slotsRemaining, setSlotsRemaining] = useState<number | null>(null);

  useEffect(() => {
    const fetch = async () => {
      const { count } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("founding_user", true);
      setSlotsRemaining(Math.max(0, 100 - (count || 0)));
    };
    fetch();
  }, []);

  return slotsRemaining;
};
