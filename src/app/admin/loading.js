"use client";
import PulseLoader from "../components/PulseLoader";

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F1F5F9]">
      <PulseLoader />
    </div>
  );
}