import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const db = new PrismaClient();

async function main() {
  const pinHash = await hash("1234", 10);

  const outlets = [
    {
      id: "OUT013",
      name: "Waypoint Fresh Kadawatha",
      brand: "Fresh",
      district: "Gampaha",
      depot: "Peliyagoda",
      dock: "rear_dock",
      parking: "normal",
      address: "Kadawatha town centre",
      contact: "+94 11 555 0130",
      windowOpen: "05:30",
      windowClose: "08:00",
    },
    {
      id: "OUT021",
      name: "Waypoint Style Kandy",
      brand: "Style",
      district: "Kandy",
      depot: "Kandy",
      dock: "mall_bay",
      parking: "mall_dock",
      address: "Kandy City Centre",
      contact: "+94 81 555 0210",
      windowOpen: "09:00",
      windowClose: "17:00",
      mallWindow: "10:00-12:00",
    },
  ];

  for (const outlet of outlets) {
    await db.outlet.upsert({ where: { id: outlet.id }, create: outlet, update: outlet });
  }

  await db.vehicle.upsert({
    where: { id: "VEH001" },
    create: {
      id: "VEH001",
      plate: "WP-CAB-1001",
      type: "truck",
      temp: "REEFER",
      weightCapKg: 2200,
      volumeCapM3: 20,
      kmPerL: 6,
      weeklyQuotaL: 180,
      depot: "Peliyagoda",
      driver: "Ruwan Jayasinghe",
    },
    update: {},
  });

  const accounts = [
    ["kasun", "Kasun Perera", "DISPATCHER", "Delivery operations dispatcher", "Peliyagoda", null, null],
    ["sandun", "Sandun Fernando", "LOADER", "Loading operations associate", "Peliyagoda", null, null],
    ["ruwan", "Ruwan Jayasinghe", "DRIVER", "Delivery driver", "Peliyagoda", "VEH001", null],
    ["tharindu", "Tharindu Angelo", "MANAGER", "Store manager, Waypoint Fresh Kadawatha", "Peliyagoda", null, "OUT013"],
  ];

  for (const [username, name, role, title, depot, vehicleId, outletId] of accounts) {
    await db.user.upsert({
      where: { username },
      create: { username, name, role, title, depot, vehicleId, outletId, pinHash },
      update: { name, role, title, depot, vehicleId, outletId, pinHash },
    });
  }

  const existing = await db.order.findUnique({ where: { ref: "ORD-DEMO-001" } });
  if (!existing) {
    await db.order.create({
      data: {
        ref: "ORD-DEMO-001",
        outletId: "OUT013",
        brand: "Fresh",
        district: "Gampaha",
        depot: "Peliyagoda",
        temp: "CHILLED",
        units: 30,
        weightKg: 420,
        volumeM3: 4.2,
        status: "CONFIRMED",
        handoffCode: "4821",
      },
    });
  }

  console.log("Waybill seed complete. Demo PIN: 1234");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => db.$disconnect());
