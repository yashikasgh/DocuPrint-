export type ClubOption = {
  id: string;
  name: string;
  acronym: string;
  colorClass: string;
  hex: string;
  logoBasePath: string;
};

export const CLUBS: ClubOption[] = [
  { id: "csi", name: "Computer Society of India", acronym: "CSI", colorClass: "bg-primary", hex: "#7c3aed", logoBasePath: "/logos/clubs/csi" },
  { id: "ieee", name: "Institute of Electrical and Electronics Engineers", acronym: "IEEE", colorClass: "bg-secondary", hex: "#f97316", logoBasePath: "/logos/clubs/ieee" },
  { id: "gdsc", name: "Google Developer Student Clubs", acronym: "GDSC", colorClass: "bg-accent", hex: "#0f9d58", logoBasePath: "/logos/clubs/gdsc" },
  { id: "tapas", name: "TAPAS", acronym: "TAPAS", colorClass: "bg-primary", hex: "#2563eb", logoBasePath: "/logos/clubs/tapas" },
  { id: "nss", name: "National Service Scheme", acronym: "NSS", colorClass: "bg-secondary", hex: "#dc2626", logoBasePath: "/logos/clubs/nss" },
  { id: "icell", name: "I-CELL", acronym: "I-CELL", colorClass: "bg-accent", hex: "#0f766e", logoBasePath: "/logos/clubs/icell" },
];

export const COLLEGE_BRAND = {
  name: "Pillai College of Engineering",
  address: "Dr. K. M. Vasudevan Pillai Campus, Plot No. 10, Sector 16, New Panvel East, Panvel, Maharashtra 410206",
  acronym: "PCE",
  hex: "#111827",
  logoBasePath: "/logos/college/pce",
};

export const getClubById = (id: string) => CLUBS.find((club) => club.id === id) ?? CLUBS[0];
