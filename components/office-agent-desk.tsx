import { useState } from "react";
import { ActivityIndicator, Text, TextInput, View } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { openExternalCheckoutUrl } from "@/lib/web-checkout";
import { AppPressable } from "@/components/app-pressable";

type Props = {
  creatorId: string;
};

/** Paid desk on ContentMate and Business Steward. Bills stay unsent until a payout exists. */
export function OfficeAgentDesk({ creatorId }: Props) {
  const colors = useColors();
  const status = trpc.aiCreators.officeAgentStatus.useQuery({ creatorId });
  const utils = trpc.useUtils();
  const [notice, setNotice] = useState<string | null>(null);
  const [toEmail, setToEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [withEmail, setWithEmail] = useState("");
  const [whenLabel, setWhenLabel] = useState("");
  const [reason, setReason] = useState("");
  const [payee, setPayee] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");

  const refresh = () => void status.refetch();

  const buy = trpc.aiCreators.purchaseOfficeAgent.useMutation({
    onSuccess: (data) => {
      if (data.checkoutUrl) {
        void openExternalCheckoutUrl(data.checkoutUrl);
        return;
      }
      setNotice("This desk is already included for you.");
      void utils.aiCreators.officeAgentStatus.invalidate({ creatorId });
    },
    onError: (error) => setNotice(error.message),
  });
  const sendEmail = trpc.aiCreators.officeAgentSendEmail.useMutation({
    onSuccess: () => {
      setNotice("Email sent to that UR member.");
      setBody("");
    },
    onError: (error) => setNotice(error.message),
  });
  const scheduleCall = trpc.aiCreators.officeAgentScheduleCall.useMutation({
    onSuccess: (call) => {
      setNotice(call.note);
      refresh();
    },
    onError: (error) => setNotice(error.message),
  });
  const fileBill = trpc.aiCreators.officeAgentFileBill.useMutation({
    onSuccess: () => {
      setNotice("Bill is on the desk. Approving it does not send the money.");
      setPayee("");
      setAmount("");
      refresh();
    },
    onError: (error) => setNotice(error.message),
  });
  const approveBill = trpc.aiCreators.officeAgentApproveBill.useMutation({
    onSuccess: () => {
      setNotice("You approved this bill. The money has not been sent.");
      refresh();
    },
    onError: (error) => setNotice(error.message),
  });

  if (!status.data || status.data.offered === false) return null;
  const desk = status.data;

  return (
    <View
      style={{
        marginHorizontal: 12,
        marginBottom: 8,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        gap: 8,
      }}
    >
      <Text style={{ color: colors.foreground, fontWeight: "800" }}>Office Agent</Text>
      <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>
        Ask in the chat, or use the boxes below. {desk.priceLabel} for {desk.days} days.
        ContentMate and Business Steward share this desk. Approving a bill does not pay the payee.
      </Text>
      {notice ? <Text style={{ color: colors.foreground, fontSize: 12 }}>{notice}</Text> : null}
      {!desk.unlocked ? (
        <AppPressable
          onPress={() => buy.mutate({ creatorId })}
          disabled={buy.isPending}
          style={{ backgroundColor: colors.primary, borderRadius: 8, padding: 10 }}
        >
          {buy.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: "#fff", fontWeight: "800", textAlign: "center" }}>
              Unlock for {desk.priceLabel}
            </Text>
          )}
        </AppPressable>
      ) : (
        <>
          <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 13 }}>Email a UR member</Text>
          <TextInput
            value={toEmail}
            onChangeText={setToEmail}
            placeholder="Their email"
            autoCapitalize="none"
            maxLength={200}
            style={fieldStyle(colors)}
          />
          <TextInput value={subject} onChangeText={setSubject} placeholder="Subject" maxLength={120} style={fieldStyle(colors)} />
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder="Message"
            maxLength={2000}
            multiline
            style={fieldStyle(colors)}
          />
          <AppPressable
            onPress={() => sendEmail.mutate({ creatorId, toEmail, subject, body })}
            disabled={sendEmail.isPending}
            style={{ backgroundColor: colors.primary, borderRadius: 8, padding: 8 }}
          >
            <Text style={{ color: "#fff", fontWeight: "700", textAlign: "center" }}>Send email</Text>
          </AppPressable>

          <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 13 }}>Set a call</Text>
          <TextInput
            value={withEmail}
            onChangeText={setWithEmail}
            placeholder="Who to call (email)"
            autoCapitalize="none"
            maxLength={200}
            style={fieldStyle(colors)}
          />
          <TextInput value={whenLabel} onChangeText={setWhenLabel} placeholder="When" maxLength={80} style={fieldStyle(colors)} />
          <TextInput value={reason} onChangeText={setReason} placeholder="What the call is for" maxLength={400} style={fieldStyle(colors)} />
          <AppPressable
            onPress={() => scheduleCall.mutate({ creatorId, withEmail, reason, whenLabel })}
            disabled={scheduleCall.isPending}
            style={{ backgroundColor: colors.primary, borderRadius: 8, padding: 8 }}
          >
            <Text style={{ color: "#fff", fontWeight: "700", textAlign: "center" }}>Save call</Text>
          </AppPressable>

          <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 13 }}>Prepare a bill</Text>
          <TextInput value={payee} onChangeText={setPayee} placeholder="Who gets paid" maxLength={120} style={fieldStyle(colors)} />
          <TextInput
            value={amount}
            onChangeText={setAmount}
            placeholder="Amount in dollars"
            keyboardType="decimal-pad"
            maxLength={10}
            style={fieldStyle(colors)}
          />
          <TextInput value={dueDate} onChangeText={setDueDate} placeholder="Due date" maxLength={40} style={fieldStyle(colors)} />
          <AppPressable
            onPress={() => {
              const dollars = Number(amount);
              if (!Number.isFinite(dollars)) {
                setNotice("Enter a dollar amount.");
                return;
              }
              fileBill.mutate({
                creatorId,
                payee,
                amountCents: Math.round(dollars * 100),
                dueDate,
              });
            }}
            disabled={fileBill.isPending}
            style={{ backgroundColor: colors.primary, borderRadius: 8, padding: 8 }}
          >
            <Text style={{ color: "#fff", fontWeight: "700", textAlign: "center" }}>Add bill</Text>
          </AppPressable>

          {desk.bills.map((bill) => (
            <View key={bill.id} style={{ gap: 4 }}>
              <Text style={{ color: colors.foreground, fontSize: 12 }}>
                {bill.payee} · ${(bill.amountCents / 100).toFixed(2)} · {bill.status === "approved" ? "Approved, not paid" : "Needs your OK"}
              </Text>
              {bill.status === "needs_approval" ? (
                <AppPressable onPress={() => approveBill.mutate({ creatorId, billId: bill.id })}>
                  <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 12 }}>Approve bill</Text>
                </AppPressable>
              ) : null}
            </View>
          ))}
          {desk.calls.map((call) => (
            <Text key={call.id} style={{ color: colors.muted, fontSize: 12 }}>
              Call {call.withWhom} · {call.whenLabel} · {call.note}
            </Text>
          ))}
        </>
      )}
    </View>
  );
}

function fieldStyle(colors: { foreground: string; border: string; background: string }) {
  return {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: colors.foreground,
    backgroundColor: colors.background,
  };
}
