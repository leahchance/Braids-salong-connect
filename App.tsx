// App.tsx
// =======================================================
// BRAID & BARBER HUB — EN-FILS APP (Expo + Supabase)
// Svep: vänster = Favorit, höger = Öppna profil
// Deposition 50 %, betalningsstubs: Swish / Klarna / Apple Pay
// Skärmar: Home → List → Profile → Booking → Checkout
// =======================================================

import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Image,
  Alert,
  ScrollView,
  Platform,
} from "react-native";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator, NativeStackScreenProps } from "@react-navigation/native-stack";
import * as Notifications from "expo-notifications";

// 👇 Svep-stöd
import "react-native-gesture-handler";
import { GestureHandlerRootView, Swipeable } from "react-native-gesture-handler";

// -------------------------------------------------------
// 🔧 MILJÖ / KONFIG
// -------------------------------------------------------
const SUPA_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const SUPA_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

let supabase: any = null;
try {
  const { createClient } = require("@supabase/supabase-js");
  if (SUPA_URL && SUPA_KEY) supabase = createClient(SUPA_URL, SUPA_KEY);
} catch (e) {
  console.warn("⚠️ Supabase-klient kunde inte initieras (saknar paket eller env).");
}

// -------------------------------------------------------
// 🧾 TYPMODELLER
// -------------------------------------------------------
type Service = {
  id: string;
  title: string;
  category: string;
  base_price_cents: number;
  duration_min: number;
  allow_addons: boolean;
  description?: string;
};
type Stylist = {
  id: string;
  display_name?: string | null;
  salon_name?: string | null;
  offers_mobile?: boolean;
  base_city?: string | null;
  rating?: number;
  services?: Service[];
  avatar_url?: string | null;
};
type Slot = {
  id: string;
  stylist_id: string;
  start_ts: string;
  end_ts: string;
  is_booked: boolean;
};
type BookingDraft = {
  stylist_id: string;
  service_id: string;
  starts_at: string;
  ends_at: string;
  price_cents: number; // total
  deposit_cents: number; // 50 %
};

// -------------------------------------------------------
// 💳 BETALNINGS-STUBS
// -------------------------------------------------------
type PaymentMethod = "swish" | "klarna" | "applepay";
async function payDeposit(method: PaymentMethod, amountCents: number, bookingId: string) {
  console.log("Deposit", method, amountCents, bookingId);
  await new Promise((r) => setTimeout(r, 900));
  return { ok: true, txId: "tx_dep_" + Date.now() };
}
async function payRemainder(method: PaymentMethod, amountCents: number, bookingId: string) {
  console.log("Remainder", method, amountCents, bookingId);
  await new Promise((r) => setTimeout(r, 900));
  return { ok: true, txId: "tx_rem_" + Date.now() };
}

// -------------------------------------------------------
// 🔗 DATA-API (Supabase RPC/queries)
// -------------------------------------------------------
async function searchStylists(city: string, category?: string): Promise<Stylist[]> {
  if (!supabase) return demoStylists(city, category); // fallback
  const { data, error } = await supabase.rpc("search_stylists", { city_q: city, category_q: category ?? null });
  if (error) throw error;
  return (data ?? []) as Stylist[];
}
async function fetchOpenSlots(stylistId: string): Promise<Slot[]> {
  if (!supabase) return demoSlots(stylistId); // fallback
  const { data, error } = await supabase.rpc("list_open_slots", { stylist: stylistId });
  if (error) throw error;
  return (data ?? []) as Slot[];
}
async function createBooking(draft: BookingDraft) {
  if (!supabase) {
    return { id: "demo_" + Date.now(), ...draft, status: "pending", payment_status: "unpaid" };
  }
  const { data, error } = await supabase
    .from("bookings")
    .insert({
      stylist_id: draft.stylist_id,
      service_id: draft.service_id,
      starts_at: draft.starts_at,
      ends_at: draft.ends_at,
      price_cents: draft.price_cents,
      deposit_cents: draft.deposit_cents,
      status: "pending",
      payment_status: "unpaid",
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// -------------------------------------------------------
// 🧭 NAVIGATION
// -------------------------------------------------------
type RootStackParamList = {
  Home: undefined;
  List: { city: string; category?: string };
  Profile: { stylist: Stylist };
  Booking: { stylist: Stylist; service: Service };
  Checkout: { bookingId: string; totalCents: number; depositCents: number };
};
const Stack = createNativeStackNavigator<RootStackParamList>();

// -------------------------------------------------------
// 🏠 HEM
// -------------------------------------------------------
const chips = ["Box Braids", "Knotless", "Sew-In", "Wig Install", "Barber: Fade", "Kids Braids"];
function HomeScreen({ navigation }: NativeStackScreenProps<RootStackParamList, "Home">) {
  const [city, setCity] = useState("Stockholm");
  const [category, setCategory] = useState<string | undefined>(undefined);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== "granted") console.log("🔕 Notis-tillstånd nekades");
      } catch {}
    })();
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <Text style={{ fontSize: 22, fontWeight: "800" }}>Hitta flät-specialister & barbers</Text>

        <View>
          <Text style={{ marginBottom: 6 }}>Stad/Kommun</Text>
          <TextInput
            value={city}
            onChangeText={setCity}
            placeholder="Skriv t ex Stockholm"
            style={{ borderWidth: 1, borderColor: "#ddd", padding: 12, borderRadius: 10 }}
          />
        </View>

        <View>
          <Text style={{ marginBottom: 6 }}>Kategori</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {chips.map((c) => (
              <TouchableOpacity
                key={c}
                onPress={() => setCategory(c)}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  borderRadius: 20,
                  backgroundColor: category === c ? "#111" : "#eee",
                }}
              >
                <Text style={{ color: category === c ? "#fff" : "#111" }}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity
          onPress={() => navigation.navigate("List", { city, category })}
          style={{ backgroundColor: "#111", padding: 14, borderRadius: 12, marginTop: 8 }}
        >
          <Text style={{ color: "#fff", textAlign: "center", fontWeight: "700" }}>Sök</Text>
        </TouchableOpacity>

        <View style={{ padding: 12, backgroundColor: "#F7F7F7", borderRadius: 10 }}>
          <Text style={{ fontWeight: "700", marginBottom: 4 }}>Diagnostik</Text>
          <Text>Supabase URL: {SUPA_URL ? "✅" : "❌ saknas"}</Text>
          <Text>Supabase Key: {SUPA_KEY ? "✅" : "❌ saknas"}</Text>
          {!SUPA_URL || !SUPA_KEY ? (
            <Text style={{ color: "#B00020", marginTop: 6 }}>Körs i DEMO-läge (mockdata). Lägg in env för riktig data.</Text>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// -------------------------------------------------------
// 📃 LIST (sökträffar) — med svep vänster/höger
// -------------------------------------------------------
function ListScreen({ route, navigation }: NativeStackScreenProps<RootStackParamList, "List">) {
  const { city, category } = route.params;
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Stylist[]>([]);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({}); // lokala favoriter

  useEffect(() => {
    (async () => {
      try {
        const res = await searchStylists(city, category);
        setItems(res);
      } catch (e: any) {
        Alert.alert("Fel", e?.message ?? String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [city, category]);

  const toggleFav = (id: string) => {
    setFavorites((f) => ({ ...f, [id]: !f[id] }));
  };

  // Svep-actions
  const RightAction = () => (
    <View style={{ backgroundColor: "#111", justifyContent: "center", paddingHorizontal: 16, borderRadius: 10 }}>
      <Text style={{ color: "#fff", fontWeight: "700" }}>Öppna</Text>
    </View>
  );
  const LeftAction = ({ active }: { active?: boolean }) => (
    <View
      style={{
        backgroundColor: active ? "#059669" : "#10B981",
        justifyContent: "center",
        paddingHorizontal: 16,
        borderRadius: 10,
      }}
    >
      <Text style={{ color: "#fff", fontWeight: "700" }}>Favorit</Text>
    </View>
  );

  if (loading)
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <View style={{ padding: 12 }}>
        <Text style={{ fontWeight: "700", marginBottom: 8 }}>
          {city}
          {category ? ` • ${category}` : ""}
        </Text>

        <FlatList
          data={items}
          keyExtractor={(it) => String(it.id)}
          renderItem={({ item }) => (
            <Swipeable
              overshootLeft={false}
              overshootRight={false}
              renderLeftActions={() => <LeftAction />}
              renderRightActions={() => <RightAction />}
              onSwipeableLeftOpen={() => {
                toggleFav(String(item.id));
                Alert.alert("Favorit", `${item.display_name || item.salon_name || "Frisör"} sparad i favoriter`);
              }}
              onSwipeableRightOpen={() => navigation.navigate("Profile", { stylist: item })}
            >
              <TouchableOpacity
                onPress={() => navigation.navigate("Profile", { stylist: item })}
                style={{
                  flexDirection: "row",
                  gap: 12,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: favorites[item.id] ? "#10B981" : "#eee",
                  backgroundColor: favorites[item.id] ? "#ECFDF5" : "#fff",
                  borderRadius: 12,
                  marginBottom: 10,
                }}
              >
                <Image
                  source={{ uri: item.avatar_url || "https://placehold.co/80x80" }}
                  style={{ width: 64, height: 64, borderRadius: 8 }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "700" }}>{item.display_name || item.salon_name || "Frisör"}</Text>
                  <Text style={{ color: "#555" }}>{item.base_city || city}</Text>
                  <Text style={{ color: "#111", marginTop: 4 }}>
                    ⭐ {item.rating ?? 0} •{" "}
                    {item.services?.[0]?.base_price_cents ? `från ${(item.services![0].base_price_cents / 100).toFixed(0)} kr` : ""}
                  </Text>
                </View>
                {favorites[item.id] && (
                  <View style={{ backgroundColor: "#10B981", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, alignSelf: "flex-start" }}>
                    <Text style={{ color: "#fff", fontWeight: "700" }}>Fav</Text>
                  </View>
                )}
              </TouchableOpacity>
            </Swipeable>
          )}
          ListEmptyComponent={<Text style={{ color: "#666" }}>Inga frisörer hittades.</Text>}
        />
      </View>
    </SafeAreaView>
  );
}

// -------------------------------------------------------
// 🙋‍♀️ PROFIL (tjänster)
// -------------------------------------------------------
function ProfileScreen({ route, navigation }: NativeStackScreenProps<RootStackParamList, "Profile">) {
  const { stylist } = route.params;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <ScrollView>
        <Image source={{ uri: stylist.avatar_url || "https://placehold.co/1000x400" }} style={{ width: "100%", height: 180 }} />
        <View style={{ padding: 16 }}>
          <Text style={{ fontSize: 20, fontWeight: "800" }}>{stylist.display_name || stylist.salon_name || "Frisör"}</Text>
          <Text style={{ color: "#555" }}>{stylist.base_city}</Text>
          <Text style={{ marginTop: 8 }}>⭐ {stylist.rating ?? 0}</Text>

          <Text style={{ fontWeight: "700", marginTop: 16, marginBottom: 8 }}>Tjänster</Text>
          {(stylist.services ?? []).map((item) => (
            <View key={String(item.id)} style={{ padding: 12, borderWidth: 1, borderColor: "#eee", borderRadius: 10, marginBottom: 10 }}>
              <Text style={{ fontWeight: "700" }}>{item.title}</Text>
              <Text style={{ color: "#555" }}>
                {item.category} • {item.duration_min} min
              </Text>
              <Text style={{ marginVertical: 6, fontWeight: "700" }}>{(item.base_price_cents / 100).toFixed(0)} kr</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate("Booking", { stylist, service: item })}
                style={{ backgroundColor: "#111", padding: 10, borderRadius: 8 }}
              >
                <Text style={{ color: "#fff", textAlign: "center" }}>Välj & boka</Text>
              </TouchableOpacity>
            </View>
          ))}
          {(!stylist.services || stylist.services.length === 0) && (
            <Text style={{ color: "#666" }}>Denna frisör har ännu inte lagt till tjänster.</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// -------------------------------------------------------
// 📅 BOKNING
// -------------------------------------------------------
function BookingScreen({ route, navigation }: NativeStackScreenProps<RootStackParamList, "Booking">) {
  const { stylist, service } = route.params;
  const [loading, setLoading] = useState(true);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selected, setSelected] = useState<Slot | undefined>();

  useEffect(() => {
    (async () => {
      try {
        const res = await fetchOpenSlots(String(stylist.id));
        setSlots(res);
      } catch (e: any) {
        Alert.alert("Fel", e?.message ?? String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [stylist.id]);

  const onConfirm = async () => {
    if (!selected) return Alert.alert("Välj tid");
    const priceCents = service.base_price_cents;
    const depositCents = Math.round(priceCents * 0.5);

    const booking = await createBooking({
      stylist_id: String(stylist.id),
      service_id: String(service.id),
      starts_at: selected.start_ts,
      ends_at: selected.end_ts,
      price_cents: priceCents,
      deposit_cents: depositCents,
    });

    navigation.replace("Checkout", {
      bookingId: booking.id,
      totalCents: priceCents,
      depositCents,
    });
  };

  if (loading)
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <View style={{ padding: 16 }}>
        <Text style={{ fontWeight: "800", fontSize: 18 }}>{service.title}</Text>
        <Text style={{ color: "#555" }}>{stylist.display_name || stylist.salon_name}</Text>
        <Text style={{ marginTop: 10, fontWeight: "700" }}>Välj en tid</Text>

        <FlatList
          data={slots}
          keyExtractor={(s) => s.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => setSelected(item)}
              style={{
                padding: 12,
                borderWidth: 1,
                borderColor: selected?.id === item.id ? "#111" : "#eee",
                borderRadius: 10,
                marginTop: 10,
              }}
            >
              <Text>
                {new Date(item.start_ts).toLocaleString()} – {new Date(item.end_ts).toLocaleTimeString()}
              </Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={{ color: "#666" }}>Inga lediga tider just nu.</Text>}
        />

        <TouchableOpacity onPress={onConfirm} style={{ backgroundColor: "#111", padding: 14, borderRadius: 12, marginTop: 16 }}>
          <Text style={{ color: "#fff", textAlign: "center", fontWeight: "700" }}>Fortsätt (50% deposition)</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// -------------------------------------------------------
// 💳 CHECKOUT
// -------------------------------------------------------
function CheckoutScreen({ route, navigation }: NativeStackScreenProps<RootStackParamList, "Checkout">) {
  const { bookingId, totalCents, depositCents } = route.params;
  const remainder = totalCents - depositCents;
  const [step, setStep] = useState<"deposit" | "done">("deposit");
  const [paying, setPaying] = useState(false);

  const doPay = async (method: PaymentMethod) => {
    try {
      setPaying(true);
      if (step === "deposit") {
        const r = await payDeposit(method, depositCents, bookingId);
        if (!r.ok) throw new Error(r?.error || "Kunde inte ta deposition");
        Alert.alert("Klart!", "Deposition mottagen. Din tid är låst.");
        setStep("done");
      } else {
        const r = await payRemainder(method, remainder, bookingId);
        if (!r.ok) throw new Error(r?.error || "Kunde inte ta slutfaktura");
        Alert.alert("Tack!", "Betalningen är klar. Kvitto skickat.");
        navigation.popToTop();
      }
    } catch (e: any) {
      Alert.alert("Fel", e?.message ?? String(e));
    } finally {
      setPaying(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <View style={{ padding: 16, gap: 16 }}>
        <Text style={{ fontSize: 18, fontWeight: "800" }}>Betalning</Text>

        {step === "deposit" ? (
          <>
            <Text>Du betalar nu depositionen för att låsa tiden.</Text>
            <Text style={{ fontWeight: "800" }}>{(depositCents / 100).toFixed(0)} kr</Text>
            <Text style={{ color: "#555" }}>
              Resterande {(remainder / 100).toFixed(0)} kr betalas efter genomförd tjänst.
            </Text>
          </>
        ) : (
          <>
            <Text>Betala resterande belopp:</Text>
            <Text style={{ fontWeight: "800" }}>{(remainder / 100).toFixed(0)} kr</Text>
          </>
        )}

        <Text style={{ marginTop: 8, fontWeight: "700" }}>Välj betalningsmetod</Text>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <ButtonPill label="Swish" bg="#06B6D4" onPress={() => doPay("swish")} disabled={paying} />
          <ButtonPill label="Klarna" bg="#111827" onPress={() => doPay("klarna")} disabled={paying} />
          <ButtonPill label="Apple Pay" bg="#000" onPress={() => doPay("applepay")} disabled={paying} />
        </View>

        <View style={{ marginTop: 24 }}>
          <Text style={{ color: "#777" }}>
            Pengarna hålls i escrow tills tjänsten markerats som klar och du godkänner (eller auto efter 24–48 h).
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

// -------------------------------------------------------
// 🧩 UI-HELPERS
// -------------------------------------------------------
function ButtonPill({
  label,
  bg,
  onPress,
  disabled,
}: {
  label: string;
  bg: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={{ backgroundColor: bg, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 999 }}
    >
      <Text style={{ color: "#fff", fontWeight: "700" }}>{label}</Text>
    </TouchableOpacity>
  );
}

// -------------------------------------------------------
// 🧪 DEMO-DATA (om Supabase saknas)
// -------------------------------------------------------
function demoStylists(city: string, category?: string): Stylist[] {
  const base: Stylist[] = [
    {
      id: "s1",
      display_name: "Ama — Knotless Pro",
      base_city: city,
      rating: 4.8,
      avatar_url: "https://placehold.co/300x300",
      services: [
        { id: "svc1", title: "Knotless braids (mid back)", category: "Knotless", base_price_cents: 250000, duration_min: 240, allow_addons: true },
        { id: "svc2", title: "Cornrows (feed-in)", category: "Feed-in Cornrows", base_price_cents: 120000, duration_min: 120, allow_addons: true },
      ],
    },
    {
      id: "s2",
      display_name: "Bella — Sew-in & Wigs",
      base_city: city,
      rating: 4.6,
      avatar_url: "https://placehold.co/300x300",
      services: [
        { id: "svc3", title: "Sew-In install", category: "Sew-In", base_price_cents: 220000, duration_min: 180, allow_addons: true },
        { id: "svc4", title: "Wig install", category: "Wig Install", base_price_cents: 190000, duration_min: 150, allow_addons: true },
      ],
    },
    {
      id: "s3",
      display_name: "Kofi — Barber Fade",
      base_city: city,
      rating: 4.7,
      avatar_url: "https://placehold.co/300x300",
      services: [{ id: "svc5", title: "Fade + line-up", category: "Barber: Fade", base_price_cents: 45000, duration_min: 45, allow_addons: false }],
    },
  ];
  return category ? base.filter((b) => (b.services ?? []).some((s) => s.category.toLowerCase().includes(category.toLowerCase()))) : base;
}
function demoSlots(stylistId: string): Slot[] {
  const now = Date.now();
  return Array.from({ length: 8 }).map((_, i) => {
    const start = new Date(now + (i + 1) * 3600_000);
    const end = new Date(start.getTime() + 90 * 60_000);
    return { id: `${stylistId}_slot_${i}`, stylist_id: stylistId, start_ts: start.toISOString(), end_ts: end.toISOString(), is_booked: false };
  });
}

// -------------------------------------------------------
// 🎨 APP-TEMA
// -------------------------------------------------------
const appTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: "#fff" },
};

// -------------------------------------------------------
// 🚀 ROOT — viktiga wrap för gesture handler
// -------------------------------------------------------
export default function App() {
  useEffect(() => {
    if (Platform.OS === "android") {
      // valfria justeringar
    }
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer theme={appTheme}>
        <Stack.Navigator>
          <Stack.Screen name="Home" component={HomeScreen} options={{ title: "Braid & Barber" }} />
          <Stack.Screen name="List" component={ListScreen} options={{ title: "Hitta frisörer" }} />
          <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: "Profil" }} />
          <Stack.Screen name="Booking" component={BookingScreen} options={{ title: "Boka" }} />
          <Stack.Screen name="Checkout" component={CheckoutScreen} options={{ title: "Betalning" }} />
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}