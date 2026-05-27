"use client";

import { useState } from "react";
import { WelcomeFrame } from "@/components/welcome/WelcomeFrame";
import { Card, CardBody } from "@/components/ui/Card";
import { Input, Label, Textarea } from "@/components/ui/Input";

export default function WelcomeBasics() {
  const [name, setName] = useState("Aaron Pilkington");
  const [birthday, setBirthday] = useState("1989-07-14");
  const [occupation, setOccupation] = useState("");
  const [company, setCompany] = useState("");
  const [spouse, setSpouse] = useState("");
  const [kids, setKids] = useState("");
  const [ig, setIg] = useState("");

  return (
    <WelcomeFrame
      step={3}
      totalSteps={5}
      back="/preview/welcome/photo"
      skip="/preview/welcome/pay"
      title="The basics"
      subtitle="Brothers see this on your profile. None of it is required — share what feels right."
      next={{ href: "/preview/welcome/pay", label: "Continue" }}
    >
      <div className="space-y-3">
        <Card>
          <CardBody className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <Label>Birthday</Label>
              <Input
                type="date"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
              />
              <p className="text-[10.5px] text-ink-400 mt-1.5">
                Used to wish you on your day. Year is optional.
              </p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-4">
            <div>
              <Label>Occupation</Label>
              <Input
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
                placeholder="Founder, Realtor, Pastor…"
              />
            </div>
            <div>
              <Label>Company</Label>
              <Input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Where you work"
              />
            </div>
            <div>
              <Label>Instagram</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[15px] text-ink-400 pointer-events-none">
                  @
                </span>
                <Input
                  value={ig}
                  onChange={(e) => setIg(e.target.value)}
                  placeholder="username"
                  className="pl-7"
                />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-4">
            <div className="text-[11px] tracking-[0.25em] uppercase text-ink-300">
              Family (optional)
            </div>
            <div>
              <Label>Spouse</Label>
              <Input
                value={spouse}
                onChange={(e) => setSpouse(e.target.value)}
                placeholder="Their first name"
              />
            </div>
            <div>
              <Label>Kids</Label>
              <Input
                value={kids}
                onChange={(e) => setKids(e.target.value)}
                placeholder="e.g. Cole (4), Ava (2)"
              />
            </div>
          </CardBody>
        </Card>
      </div>
    </WelcomeFrame>
  );
}
