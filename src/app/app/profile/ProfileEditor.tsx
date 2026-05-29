"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { Card, CardBody } from "@/components/ui/Card";
import { AvatarUpload } from "@/components/profile/AvatarUpload";
import { InterestChips } from "@/components/profile/InterestChips";
import { updateProfileAction } from "@/lib/profile/actions";
import { INTERESTS } from "@/lib/profile/interests";
import { useToast } from "@/components/ui/Toast";
import { useEffect } from "react";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="gold" loading={pending} fullWidth size="lg">
      Save changes
    </Button>
  );
}

interface Defaults {
  full_name: string;
  username: string;
  bio: string;
  occupation: string;
  company: string;
  instagram_url: string;
  phone: string;
  profile_photo_url: string | null;
  interests: string[];
  venmo_username: string;
  cashapp_username: string;
  birthday: string;
  spouse: string;
  kids: string;
}

export function ProfileEditor({
  authUserId,
  defaults,
}: {
  authUserId: string;
  defaults: Defaults;
}) {
  const [state, formAction] = useFormState(updateProfileAction, {} as {
    error?: string;
    success?: boolean;
  });
  const { push } = useToast();

  useEffect(() => {
    if (state?.success) push({ title: "Profile saved", variant: "success" });
    if (state?.error) push({ title: "Couldn't save", body: state.error, variant: "error" });
  }, [state, push]);

  return (
    <form action={formAction} className="space-y-4 px-5">
      <Card>
        <CardBody className="space-y-4">
          <AvatarUpload
            authUserId={authUserId}
            name={defaults.full_name}
            defaultUrl={defaults.profile_photo_url}
          />
          <div>
            <Label>Name</Label>
            <Input name="full_name" defaultValue={defaults.full_name} required />
          </div>
          <div>
            <Label>Username (used for @mentions)</Label>
            <Input
              name="username"
              defaultValue={defaults.username}
              placeholder="your-handle"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              pattern="[a-z0-9_\-]{3,24}"
              title="3–24 characters: lowercase letters, digits, _ or -"
            />
          </div>
          <div>
            <Label>Short bio</Label>
            <Textarea name="bio" defaultValue={defaults.bio} rows={3} />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-4">
          <div>
            <Label>Occupation</Label>
            <Input name="occupation" defaultValue={defaults.occupation} placeholder="Founder, Realtor, ..." />
          </div>
          <div>
            <Label>Company</Label>
            <Input name="company" defaultValue={defaults.company} />
          </div>
          <div>
            <Label>Instagram</Label>
            <Input
              name="instagram_url"
              defaultValue={defaults.instagram_url}
              placeholder="https://instagram.com/your_handle"
            />
          </div>
          <div>
            <Label>Phone (private)</Label>
            <Input name="phone" defaultValue={defaults.phone} type="tel" />
          </div>
        </CardBody>
      </Card>

      {/* Pay handles — render as clickable pills on member profiles */}
      <Card>
        <CardBody className="space-y-4">
          <div>
            <Label>Venmo username</Label>
            <Input
              name="venmo_username"
              defaultValue={defaults.venmo_username}
              placeholder="Your-Venmo-Handle"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>
          <div>
            <Label>CashApp $tag</Label>
            <Input
              name="cashapp_username"
              defaultValue={defaults.cashapp_username}
              placeholder="your-cashtag"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>
        </CardBody>
      </Card>

      {/* Family / personal */}
      <Card>
        <CardBody className="space-y-4">
          <div>
            <Label>Birthday</Label>
            <Input name="birthday" type="date" defaultValue={defaults.birthday} />
          </div>
          <div>
            <Label>Spouse / partner</Label>
            <Input name="spouse" defaultValue={defaults.spouse} placeholder="Her name" />
          </div>
          <div>
            <Label>Kids</Label>
            <Input
              name="kids"
              defaultValue={defaults.kids}
              placeholder="Kid names + ages"
            />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <Label>Interests</Label>
          <InterestChips options={INTERESTS} defaultValue={defaults.interests} />
        </CardBody>
      </Card>

      <Submit />
    </form>
  );
}
