"use client";

import { useState } from "react";
import { Camera, Key, Mail, Shield, User } from "lucide-react";

import { ModuleHeader } from "@/components/layout/module-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/auth-context";
import { getToken } from "@/shared/auth-token";
import { parseJwtPayload } from "@/shared/jwt";

export function ProfileView() {
  const { user, summary } = useAuth();
  const [emailNotif, setEmailNotif] = useState(true);
  const [pushNotif, setPushNotif] = useState(false);

  const token = typeof window !== "undefined" ? getToken() : null;
  const claims = token ? parseJwtPayload(token) : null;

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? "U";

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Profile & Preferences"
        breadcrumbs={["Home", "Profile"]}
        backHref="/dashboard"
        icon={<User className="size-5" />}
        iconClassName="bg-violet-500"
      />

      <div className="flex items-center gap-4 rounded-[16px] border border-border/60 bg-card p-6 shadow-soft">
        <div className="relative">
          <Avatar className="size-20">
            <AvatarFallback className="bg-primary/15 text-2xl font-bold text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <button
            type="button"
            className="absolute -right-1 -bottom-1 flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-soft"
          >
            <Camera className="size-3.5" />
          </button>
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">
            {user?.email?.split("@")[0] ?? "User"}
          </h2>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {summary?.organizationName}
          </p>
        </div>
      </div>

      <Tabs defaultValue="account">
        <TabsList>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="account" className="mt-4">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="text-base">Account Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Display Name</Label>
                  <Input defaultValue={user?.email?.split("@")[0]} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input defaultValue={user?.email} disabled />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Organization ID</Label>
                <Input
                  defaultValue={user?.organizationId}
                  disabled
                  className="font-mono text-xs"
                />
              </div>
              <Button>Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-4">
          <Card className="shadow-soft">
            <CardContent className="space-y-4 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Mail className="size-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Email Notifications</p>
                    <p className="text-xs text-muted-foreground">
                      Receive updates via email
                    </p>
                  </div>
                </div>
                <Checkbox
                  checked={emailNotif}
                  onCheckedChange={(v) => setEmailNotif(!!v)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bell className="size-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Push Notifications</p>
                    <p className="text-xs text-muted-foreground">
                      Browser push alerts
                    </p>
                  </div>
                </div>
                <Checkbox
                  checked={pushNotif}
                  onCheckedChange={(v) => setPushNotif(!!v)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="mt-4">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="text-base">Security & Session</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 rounded-xl bg-muted/40 p-4">
                <Shield className="size-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">Roles</p>
                  <p className="text-xs text-muted-foreground">
                    {user?.roles?.join(", ") ?? ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-muted/40 p-4">
                <Key className="size-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">Licensed Modules</p>
                  <p className="text-xs text-muted-foreground">
                    {user?.modules?.join(", ") ?? ""}
                  </p>
                </div>
              </div>
              {claims ? (
                <pre className="overflow-x-auto rounded-xl bg-muted/40 p-4 text-xs text-muted-foreground">
                  {JSON.stringify(claims, null, 2)}
                </pre>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Bell(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}
