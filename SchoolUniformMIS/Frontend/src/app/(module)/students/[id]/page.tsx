"use client";

import { use } from "react";
import { StudentProfileView } from "@/modules/students/student-profile-view";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <StudentProfileView studentId={id} />;
}
