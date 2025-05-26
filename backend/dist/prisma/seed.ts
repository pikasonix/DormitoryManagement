// File sinh data mẫu cho Prisma
import {
  PrismaClient,
  Role,
  Gender,
  RoomType,
  RoomStatus,
  StudentStatus,
  // Amenity, // Amenity type is inferred or not directly used as enum here
  PaymentType, // Used by InvoiceItem
  FeeType,     // New, used by FeeRate and potentially InvoiceItem
  InvoiceStatus,
  UtilityType,
  MaintenanceStatus,
  TransferStatus,
  VehicleType,
  MediaType,
} from '@prisma/client';
import bcrypt from 'bcryptjs';
import { Decimal } from '@prisma/client/runtime/library'; // Correct import for Decimal

const prisma = new PrismaClient();

// --- Helper Functions ---
function getRandomElement<T>(arr: T[]): T {
  if (arr.length === 0) {
    throw new Error("Cannot get random element from an empty array.");
  }
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Helper function that now returns null instead of creating media data
// function createPlaceholderMediaData(type: MediaType, namePrefix: string, index: number) {
//   return null; // No longer creating media data
// }

async function main() {
  console.log('Start seeding ...');

  // --- Clean Up Existing Data (Optional but recommended for development) ---
  console.log('Deleting existing data...');
  await prisma.user.updateMany({ data: { avatarId: null } });

  await prisma.payment.deleteMany();
  await prisma.invoiceItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.utilityMeterReading.deleteMany();
  await prisma.maintenance.deleteMany();
  await prisma.roomTransfer.deleteMany();
  await prisma.vehicleRegistration.deleteMany();
  await prisma.roomAmenity.deleteMany();
  await prisma.feeRate.deleteMany(); // New: Clean up FeeRate
  await prisma.studentProfile.deleteMany();
  await prisma.staffProfile.deleteMany();
  await prisma.media.deleteMany();
  await prisma.user.deleteMany();
  await prisma.room.deleteMany();
  await prisma.building.deleteMany();
  await prisma.amenity.deleteMany();
  console.log('Existing data deleted.');

  // --- Create Amenities ---
  console.log('Creating amenities...');
  const amenities = await prisma.amenity.createManyAndReturn({
    data: [
      { name: 'Điều hòa', description: 'Máy lạnh làm mát phòng' },
      { name: 'Nóng lạnh', description: 'Bình nước nóng cho sinh hoạt' },
      { name: 'WC Trong Phòng', description: 'Nhà vệ sinh trong phòng' }, // Changed from "2 WC" to be more general for amenity
      { name: 'Nhà tắm Trong Phòng', description: 'Nhà tắm trong phòng' }, // Changed
      { name: 'Tủ đồ cá nhân', description: 'Tủ có khóa riêng cho mỗi sinh viên' },
      { name: 'Giường tầng', description: 'Giường tầng có đệm' },
      { name: 'Bàn học', description: 'Bàn học cá nhân' },
    ],
  });
  console.log(`Created ${amenities.length} amenities.`);

  // --- Create Fee Rates ---
  console.log('Creating fee rates...');
  const feeRates = {
    electricity: await prisma.feeRate.create({
      data: {
        name: 'Tiền điện sinh hoạt',
        feeType: FeeType.ELECTRICITY,
        unitPrice: new Decimal(3500),
        unit: 'kWh',
        effectiveFrom: new Date(2023, 0, 1),
        isActive: true,
        description: 'Đơn giá điện theo quy định',
      },
    }),
    water: await prisma.feeRate.create({
      data: {
        name: 'Tiền nước sinh hoạt',
        feeType: FeeType.WATER,
        unitPrice: new Decimal(15000),
        unit: 'm3',
        effectiveFrom: new Date(2023, 0, 1),
        isActive: true,
        description: 'Đơn giá nước theo quy định',
      },
    }),
    parkingMotorbike: await prisma.feeRate.create({
      data: {
        name: 'Phí gửi xe máy',
        feeType: FeeType.PARKING,
        vehicleType: VehicleType.MOTORBIKE,
        unitPrice: new Decimal(80000),
        unit: 'tháng',
        effectiveFrom: new Date(2023, 0, 1),
        isActive: true,
      },
    }),
    parkingBicycle: await prisma.feeRate.create({
      data: {
        name: 'Phí gửi xe đạp',
        feeType: FeeType.PARKING,
        vehicleType: VehicleType.BICYCLE,
        unitPrice: new Decimal(30000),
        unit: 'tháng',
        effectiveFrom: new Date(2023, 0, 1),
        isActive: true,
      },
    }),
  };
  console.log(`Created ${Object.keys(feeRates).length} fee rates.`);

  // --- Create Buildings ---
  console.log('Creating buildings...');
  const buildingB3 = await prisma.building.create({
    data: {
      name: 'B3',
      address: 'KTX Bách Khoa Hà Nội, Khu B',
      description: 'Tòa nhà KTX hiện đại, gần căng tin',
      // images: { create: [ ...media data... ] } // If seeding media
    },
  });
  const buildingB9 = await prisma.building.create({
    data: {
      name: 'B9',
      address: 'KTX Bách Khoa Hà Nội, Khu B',
      description: 'Tòa nhà KTX mới nâng cấp, có phòng tự học',
      // images: { create: [ ...media data... ] } // If seeding media
    },
  });
  console.log(`Created buildings: ${buildingB3.name}, ${buildingB9.name}`);

  // --- Create Rooms ---
  console.log('Creating rooms...');
  const rooms: Array<Awaited<ReturnType<typeof prisma.room.create>>> = [];
  const roomTypes = {
    B3: RoomType.MALE,      // B3 for male students
    B9: RoomType.FEMALE     // B9 for female students
  };

  // Room capacities (number of students per room)
  const capacityOptions = [4, 6, 8];

  // Room fee based on capacity
  const roomFees = {
    4: new Decimal(1200000),  // 4-student room: 1,200,000 VND
    6: new Decimal(800000),   // 6-student room: 800,000 VND
    8: new Decimal(600000)    // 8-student room: 600,000 VND
  };

  const amenityBed = amenities.find(a => a.name === 'Giường tầng');
  const amenityLocker = amenities.find(a => a.name === 'Tủ đồ cá nhân');
  const amenityAC = amenities.find(a => a.name === 'Điều hòa');
  const amenityHeater = amenities.find(a => a.name === 'Nóng lạnh');
  const amenityWC = amenities.find(a => a.name === 'WC Trong Phòng');
  const amenityDesk = amenities.find(a => a.name === 'Bàn học');

  if (!amenityBed || !amenityLocker || !amenityAC || !amenityHeater || !amenityWC || !amenityDesk) {
    throw new Error("Required base amenities not found!");
  }

  for (const building of [buildingB3, buildingB9]) {
    const buildingType = building.name === 'B3' ? roomTypes.B3 : roomTypes.B9;

    for (let floor = 1; floor <= 5; floor++) {
      for (let roomNum = 1; roomNum <= 10; roomNum++) {
        const capacity = getRandomElement(capacityOptions);
        const roomNumberStr = `${floor}0${roomNum}`;
        const room = await prisma.room.create({
          data: {
            buildingId: building.id,
            number: roomNumberStr,
            type: buildingType,
            capacity: capacity,
            floor: floor,
            status: RoomStatus.AVAILABLE,
            description: `Phòng ${capacity} người, tầng ${floor}, tòa ${building.name}`,
            roomFee: roomFees[capacity],
            amenities: {
              create: [
                { amenityId: amenityAC.id, quantity: 1 },
                { amenityId: amenityHeater.id, quantity: 1 },
                { amenityId: amenityWC.id, quantity: capacity <= 6 ? 1 : 2 },
                { amenityId: amenityLocker.id, quantity: capacity },
                { amenityId: amenityBed.id, quantity: capacity / 2 },
                { amenityId: amenityDesk.id, quantity: capacity },
              ],
            },
          },
        });
        rooms.push(room);
      }
    }
    // Create one management room per building
    const managementRoom = await prisma.room.create({
      data: {
        buildingId: building.id,
        number: `VP${building.name}`,
        type: RoomType.MANAGEMENT,
        capacity: 2,
        floor: 1,
        status: RoomStatus.AVAILABLE,
        description: `Phòng quản lý tòa ${building.name}`,
        roomFee: new Decimal(0), // Management rooms don't have a fee
        amenities: {
          create: [
            { amenityId: amenityAC.id, quantity: 1 },
            { amenityId: amenityDesk.id, quantity: 2 },
          ]
        }
      }
    });
    rooms.push(managementRoom);
  }
  console.log(`Created ${rooms.length} rooms.`);

  // --- Create Admin User ---
  console.log('Creating admin user...');
  const adminPassword = await bcrypt.hash('admin123', 10);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {
      password: adminPassword,
      isActive: true,
      role: Role.ADMIN,
    },
    create: {
      email: 'admin@example.com',
      password: adminPassword,
      role: Role.ADMIN,
      isActive: true,
      // avatarId: createdMedia.id, // If seeding media
    },
  });
  console.log(`Created admin user: ${adminUser.email}`);

  // --- Create Staff Users and Profiles ---
  console.log('Creating staff users and profiles...');
  const staffPassword = await bcrypt.hash('staff123', 10);
  const staffData = [
    { email: 'staff.b3@example.com', fullName: 'Nguyễn Văn An', position: 'Quản lý tòa B3', gender: Gender.MALE, managedBuildingId: buildingB3.id },
    { email: 'staff.b9@example.com', fullName: 'Trần Thị Bình', position: 'Quản lý tòa B9', gender: Gender.FEMALE, managedBuildingId: buildingB9.id },
    { email: 'staff.tech@example.com', fullName: 'Lê Minh Cường', position: 'Nhân viên kỹ thuật', gender: Gender.MALE, managedBuildingId: null },
  ];
  const createdStaffProfiles: Array<Awaited<ReturnType<typeof prisma.staffProfile.create>>> = [];
  for (const staff of staffData) {
    const user = await prisma.user.create({
      data: {
        email: staff.email,
        password: staffPassword,
        role: Role.STAFF,
        isActive: true,
        // avatarId: createdMedia.id, // If seeding media
        staffProfile: {
          create: {
            fullName: staff.fullName,
            phoneNumber: `0987654${Math.floor(Math.random() * 900) + 100}`,
            position: staff.position,
            identityCardNumber: `0010${Math.floor(Math.random() * 90000000) + 10000000}`,
            gender: staff.gender,
            birthDate: getRandomDate(new Date(1980, 0, 1), new Date(1995, 11, 31)),
            address: '1 Dai Co Viet, Hai Ba Trung, Hanoi',
            managedBuildingId: staff.managedBuildingId,
          },
        },
      },
      include: { staffProfile: true },
    });
    if (user.staffProfile) {
      createdStaffProfiles.push(user.staffProfile);
    }
    console.log(`Created staff: ${user.email} - ${staff.fullName}`);
  }
  console.log(`Created ${createdStaffProfiles.length} staff profiles.`);
  const assignedStaffForMaintenance = createdStaffProfiles.find(s => s.position === 'Nhân viên kỹ thuật');

  // --- Create Student Users and Profiles ---
  console.log('Creating student users and profiles...');
  const studentPassword = await bcrypt.hash('student123', 10);
  const firstNamesMale = ['Hùng', 'Dũng', 'Minh', 'Khải', 'Sơn', 'Tuấn', 'Đức', 'Hoàng', 'Nam', 'Quân', 'Việt', 'Long', 'Phúc', 'Trung', 'Hiếu'];
  const firstNamesFemale = ['Lan', 'Hoa', 'Mai', 'Hương', 'Nga', 'Linh', 'Trang', 'Thảo', 'Hà', 'Thu', 'Ngọc', 'Anh', 'Phương', 'Yến', 'Oanh'];
  const lastNames = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương'];
  const faculties = ['CNTT', 'Điện tử Viễn thông', 'Cơ khí', 'Kinh tế Quản lý', 'Ngoại ngữ', 'Toán tin', 'Vật liệu', 'Hóa học', 'Sinh học - Thực phẩm', 'Vật lý kỹ thuật'];
  const provinces = ['Hà Nội', 'Hải Phòng', 'Đà Nẵng', 'TP HCM', 'Nghệ An', 'Thanh Hóa', 'Hà Tĩnh', 'Nam Định', 'Thái Bình', 'Bắc Ninh', 'Hải Dương', 'Quảng Ninh', 'Phú Thọ', 'Vĩnh Phúc'];
  const priorityObjects = ['Con thương binh', 'Hộ nghèo', 'Dân tộc thiểu số', null, null, null]; // Added null for non-priority

  let availableStudentRooms = await prisma.room.findMany({
    where: {
      status: { notIn: [RoomStatus.UNDER_MAINTENANCE, RoomStatus.FULL] },
      type: { notIn: [RoomType.MANAGEMENT] }, // Students should not be in management rooms
      capacity: { gt: 0 }
    },
    include: { building: true }, // Include building to determine gender
    orderBy: { buildingId: 'asc' }
  });

  const createdStudentProfiles: Array<Awaited<ReturnType<typeof prisma.studentProfile.create>>> = [];

  for (let i = 1; i <= 150; i++) { // Increased number of students
    if (availableStudentRooms.length === 0) {
      console.warn("No more available rooms to assign students.");
      break;
    }

    const roomIndex = Math.floor(Math.random() * availableStudentRooms.length);
    const assignedRoom = availableStudentRooms[roomIndex];

    // Determine gender based on building (assuming B3 is male, B9 is female)
    // This needs to be adapted if building gender assignment is different or more complex
    const gender = assignedRoom.building?.name === 'B3' ? Gender.MALE : Gender.FEMALE;

    const firstName = gender === Gender.MALE ? getRandomElement(firstNamesMale) : getRandomElement(firstNamesFemale);
    const lastName = getRandomElement(lastNames);
    const fullName = `${lastName} Văn ${firstName}`.replace('Văn Văn', 'Văn').replace('Văn Thị', 'Thị'); // Basic name construction
    if (gender === Gender.FEMALE) {
      fullName.replace('Văn', 'Thị'); // Common convention
    }

    const email = `student${i.toString().padStart(3, '0')}@example.com`;
    const studentIdYear = 18 + Math.floor(i / 20); // For student IDs like 2018xxxx, 2019xxxx
    const studentIdSuffix = String(1000 + i).slice(-4); // Ensure 4 digits for ID part
    const studentId = `20${studentIdYear}${studentIdSuffix}`;
    const courseYear = 63 + Math.floor(i / 25); // K63, K64, etc.

    const birthDate = getRandomDate(new Date(1999, 0, 1), new Date(2005, 11, 31));
    // Simplified identity card number. Real generation is complex.
    const identityCardNumber = `0${String(Math.floor(Math.random() * 99)).padStart(2, '0')}${String(birthDate.getFullYear()).slice(-2)}${String(Math.floor(Math.random() * 999999)).padStart(6, '0')}`;


    try {
      const user = await prisma.user.create({
        data: {
          email: email,
          password: studentPassword,
          role: Role.STUDENT,
          isActive: true,
          // avatarId: createdMedia.id, // If seeding media
          studentProfile: {
            create: {
              studentId: studentId,
              fullName: fullName,
              gender: gender,
              birthDate: birthDate,
              identityCardNumber: identityCardNumber,
              ethnicity: 'Kinh',
              priorityObject: getRandomElement(priorityObjects),
              phoneNumber: `0912345${String(i).padStart(3, '0')}`,
              personalEmail: `personal.student${i.toString().padStart(3, '0')}@mail.com`,
              faculty: getRandomElement(faculties),
              courseYear: courseYear,
              className: `${faculties[0].substring(0, 2)}${courseYear}A${String(i % 5 + 1)}`, // Example class name
              permanentProvince: getRandomElement(provinces),
              permanentDistrict: 'Quận/Huyện ABC',
              permanentAddress: `Số ${i}, Đường XYZ, Phường 123`,
              status: StudentStatus.RENTING,
              startDate: getRandomDate(new Date(2023, 7, 15), new Date(2024, 1, 28)), // Aug 15, 2023 to Feb 28, 2024
              contractEndDate: new Date(2025, 5, 30), // June 30, 2025
              checkInDate: new Date(), // Assume checked in today for simplicity
              fatherName: `${getRandomElement(lastNames)} Văn ${getRandomElement(firstNamesMale)}`.replace('Văn Văn', 'Văn'),
              fatherDobYear: birthDate.getFullYear() - (25 + Math.floor(Math.random() * 10)),
              motherName: `${getRandomElement(lastNames)} Thị ${getRandomElement(firstNamesFemale)}`,
              motherDobYear: birthDate.getFullYear() - (23 + Math.floor(Math.random() * 10)),
              emergencyContactRelation: 'Bố',
              emergencyContactPhone: `0900000${String(i).padStart(3, '0')}`,
              emergencyContactAddress: `Địa chỉ khẩn cấp của SV ${i}`,
              roomId: assignedRoom.id,
            },
          },
        },
        include: { studentProfile: true },
      });

      if (user.studentProfile) {
        createdStudentProfiles.push(user.studentProfile);
        const updatedRoom = await prisma.room.update({
          where: { id: assignedRoom.id },
          data: { actualOccupancy: { increment: 1 } },
        });
        if (updatedRoom.actualOccupancy >= updatedRoom.capacity) {
          await prisma.room.update({
            where: { id: updatedRoom.id },
            data: { status: RoomStatus.FULL }
          });
          // Remove full room from available list
          availableStudentRooms = availableStudentRooms.filter(r => r.id !== updatedRoom.id);
        }
        console.log(`Created student: ${user.email} - ${fullName} in Room ${assignedRoom.number} (${updatedRoom.actualOccupancy}/${updatedRoom.capacity})`);
      }

    } catch (error: any) {
      if (error.code === 'P2002' && error.meta?.target) { // Check if target exists
        console.warn(`Skipping student ${i} (${email}/${studentId}) due to unique constraint violation on fields: ${error.meta.target.join(', ')}`);
      } else {
        console.error(`Failed to create student ${i} (${email}):`, error);
      }
    }
  }
  console.log(`Created ${createdStudentProfiles.length} student profiles.`);

  // --- Create Sample Invoices ---
  console.log('Creating sample invoices...');
  const createdInvoices: Array<Awaited<ReturnType<typeof prisma.invoice.create>>> = [];

  for (const studentProfile of createdStudentProfiles.slice(0, Math.min(50, createdStudentProfiles.length))) {
    if (!studentProfile.roomId) continue;

    const room = await prisma.room.findUnique({ where: { id: studentProfile.roomId } });
    if (!room) continue;

    const billingMonth = 5; // May
    const billingYear = 2024;

    // 1. Room Fee Invoice (Personal)
    const roomFeeInvoice = await prisma.invoice.create({
      data: {
        studentProfileId: studentProfile.id,
        billingMonth: billingMonth,
        billingYear: billingYear,
        issueDate: new Date(billingYear, billingMonth - 1, 1), // May 1st
        dueDate: new Date(billingYear, billingMonth - 1, 15),  // May 15th
        paymentDeadline: new Date(billingYear, billingMonth - 1, 25), // May 25th
        totalAmount: room.roomFee, // Using roomFee from Room model
        status: getRandomElement([InvoiceStatus.PAID, InvoiceStatus.UNPAID, InvoiceStatus.OVERDUE]),
        items: {
          create: {
            type: PaymentType.ROOM_FEE, // Matches InvoiceItem schema
            description: `Tiền phòng T${billingMonth}/${billingYear} - Phòng ${room.number} (${room.capacity} người)`,
            amount: room.roomFee,
          }
        }
      },
      include: { items: true }
    });
    createdInvoices.push(roomFeeInvoice);
    console.log(`Created ROOM_FEE invoice ${roomFeeInvoice.id} (Total: ${roomFeeInvoice.totalAmount}) for student ${studentProfile.studentId}`);

    if (roomFeeInvoice.status === InvoiceStatus.PAID) {
      await prisma.payment.create({
        data: {
          invoiceId: roomFeeInvoice.id,
          studentProfileId: studentProfile.id,
          amount: roomFeeInvoice.totalAmount,
          paymentDate: getRandomDate(roomFeeInvoice.issueDate, roomFeeInvoice.dueDate),
          paymentMethod: getRandomElement(['Chuyển khoản', 'Tiền mặt', 'VNPay']),
        }
      });
      await prisma.invoice.update({
        where: { id: roomFeeInvoice.id },
        data: { paidAmount: roomFeeInvoice.totalAmount }
      });
      console.log(`Created payment for PAID invoice ${roomFeeInvoice.id}`);
    }
  }

  // 3. Utility Invoice (Per Room - Example for a few rooms)
  const roomsForUtilityInvoice = await prisma.room.findMany({
    where: { actualOccupancy: { gt: 0 }, type: { notIn: [RoomType.MANAGEMENT] } },
    take: 5, // Create utility invoices for 5 rooms
  });

  for (const roomForUtility of roomsForUtilityInvoice) {
    const billingMonth = 5; // May
    const billingYear = 2024;
    const prevBillingMonth = 4;
    const prevBillingYear = 2024;

    // Create some dummy readings first
    const oldElectricityReading = Math.random() * 1000 + 500; // 500 - 1500
    const newElectricityReading = oldElectricityReading + (Math.random() * 100 + 50); // consumed 50-150 kWh
    const oldWaterReading = Math.random() * 200 + 50; // 50 - 250
    const newWaterReading = oldWaterReading + (Math.random() * 20 + 10); // consumed 10-30 m3

    await prisma.utilityMeterReading.createMany({
      data: [
        { roomId: roomForUtility.id, type: UtilityType.ELECTRICITY, readingDate: new Date(prevBillingYear, prevBillingMonth - 1, 28), indexValue: oldElectricityReading, billingMonth: prevBillingMonth, billingYear: prevBillingYear },
        { roomId: roomForUtility.id, type: UtilityType.ELECTRICITY, readingDate: new Date(billingYear, billingMonth - 1, 28), indexValue: newElectricityReading, billingMonth: billingMonth, billingYear: billingYear },
        { roomId: roomForUtility.id, type: UtilityType.WATER, readingDate: new Date(prevBillingYear, prevBillingMonth - 1, 28), indexValue: oldWaterReading, billingMonth: prevBillingMonth, billingYear: prevBillingYear },
        { roomId: roomForUtility.id, type: UtilityType.WATER, readingDate: new Date(billingYear, billingMonth - 1, 28), indexValue: newWaterReading, billingMonth: billingMonth, billingYear: billingYear },
      ]
    });

    const electricityConsumed = new Decimal(newElectricityReading - oldElectricityReading);
    const waterConsumed = new Decimal(newWaterReading - oldWaterReading);

    const electricityAmount = electricityConsumed.mul(feeRates.electricity.unitPrice);
    const waterAmount = waterConsumed.mul(feeRates.water.unitPrice);
    const totalUtilityAmount = electricityAmount.add(waterAmount);

    const utilityInvoice = await prisma.invoice.create({
      data: {
        roomId: roomForUtility.id,
        billingMonth: billingMonth,
        billingYear: billingYear,
        issueDate: new Date(billingYear, billingMonth, 5), // June 5th for May utilities
        dueDate: new Date(billingYear, billingMonth, 20),
        paymentDeadline: new Date(billingYear, billingMonth, 25),
        totalAmount: totalUtilityAmount,
        status: InvoiceStatus.UNPAID,
        notes: `Hóa đơn điện nước T${billingMonth}/${billingYear} cho phòng ${roomForUtility.number}`,
        items: {
          create: [
            { type: PaymentType.ELECTRICITY, description: `Tiền điện T${billingMonth} (CS: ${newElectricityReading.toFixed(1)} - ${oldElectricityReading.toFixed(1)} = ${electricityConsumed.toFixed(1)} kWh)`, amount: electricityAmount },
            { type: PaymentType.WATER, description: `Tiền nước T${billingMonth} (CS: ${newWaterReading.toFixed(1)} - ${oldWaterReading.toFixed(1)} = ${waterConsumed.toFixed(1)} m³)`, amount: waterAmount },
          ]
        }
      },
      include: { items: true }
    });
    createdInvoices.push(utilityInvoice);
    console.log(`Created UTILITY invoice ${utilityInvoice.id} for room ${roomForUtility.number}`);
  }
  console.log(`Created ${createdInvoices.length} total invoices.`);


  // --- Create Sample Maintenance Requests ---
  console.log('Creating maintenance requests...');
  const roomsWithStudentsForMaintenance = await prisma.room.findMany({
    where: { actualOccupancy: { gt: 0 }, type: { notIn: [RoomType.MANAGEMENT] } },
    include: { residents: { select: { userId: true, fullName: true } } }, // Select only needed fields
    take: 5,
  });

  if (assignedStaffForMaintenance && roomsWithStudentsForMaintenance.length > 0) {
    for (const roomToReport of roomsWithStudentsForMaintenance) {
      if (roomToReport.residents.length === 0) continue;
      const reportingStudent = getRandomElement(roomToReport.residents);
      const issueType = getRandomElement(['Điều hòa', 'Bóng đèn', 'Vòi nước', 'Cửa sổ']);
      const status = getRandomElement([MaintenanceStatus.PENDING, MaintenanceStatus.ASSIGNED, MaintenanceStatus.IN_PROGRESS]);

      await prisma.maintenance.create({
        data: {
          roomId: roomToReport.id,
          reportedById: reportingStudent.userId, // Correctly uses userId from StudentProfile
          issue: `${issueType} phòng ${roomToReport.number} bị hỏng/cần sửa. (${reportingStudent.fullName} báo)`,
          reportDate: getRandomDate(new Date(2024, 3, 1), new Date()), // Reported between Apr 1 and today
          status: status,
          assignedToId: status !== MaintenanceStatus.PENDING ? assignedStaffForMaintenance.id : null,
          // images: { create: [ ...media data... ] } // If seeding media
        }
      });
      console.log(`Created maintenance request (${issueType}) for room ${roomToReport.number} by student userId ${reportingStudent.userId}.`);
    }
  } else {
    console.log("Skipping maintenance requests: No staff for assignment or no students in rooms.");
  }

  // --- Create Sample Vehicle Registration ---
  console.log('Creating vehicle registrations...');
  const studentsForVehicles = createdStudentProfiles.slice(0, Math.min(20, createdStudentProfiles.length));
  for (const student of studentsForVehicles) {
    const vehicleType = getRandomElement([VehicleType.MOTORBIKE, VehicleType.BICYCLE]);
    let parkingFeeRate;
    if (vehicleType === VehicleType.MOTORBIKE) parkingFeeRate = feeRates.parkingMotorbike;
    else if (vehicleType === VehicleType.BICYCLE) parkingFeeRate = feeRates.parkingBicycle;

    if (!parkingFeeRate) {
      console.warn(`No parking fee rate found for ${vehicleType} for student ${student.studentId}`);
      continue;
    }

    await prisma.vehicleRegistration.create({
      data: {
        studentProfileId: student.id,
        vehicleType: vehicleType,
        licensePlate: vehicleType === VehicleType.MOTORBIKE
          ? `${getRandomElement(['29', '30', '99'])}-${getRandomElement(['H1', 'B2', 'K1'])}-${String(Math.floor(Math.random() * 90000) + 10000).padStart(5, '0')}`
          : `Bike-${student.studentId.slice(-4)}`,
        brand: vehicleType === VehicleType.MOTORBIKE ? getRandomElement(['Honda', 'Yamaha', 'Suzuki']) : getRandomElement(['Thống Nhất', 'Giant', 'ASAMA']),
        color: getRandomElement(['Đen', 'Trắng', 'Đỏ', 'Xanh', 'Bạc']),
        parkingCardNo: `PK${String(student.id).padStart(4, '0')}${vehicleType.substring(0, 1)}`,
        isActive: true,
        startDate: student.startDate, // Assume parking starts when student starts
        // endDate: // Optional
        // notes: // Optional
        // images: { create: [ ...media data... ] } // If seeding media
        // monthlyFee is GONE, it's in FeeRate
      }
    });
    // Note: An invoice for parking would be created separately based on this registration and FeeRate.
  }
  console.log(`Created ${studentsForVehicles.length} vehicle registrations. Parking fees are in FeeRate.`);


  // --- Create Sample Room Transfer (Optional) ---
  console.log('Creating a sample room transfer request...');
  const studentToTransfer = createdStudentProfiles.find(s => s.roomId !== null && s.status === StudentStatus.RENTING);

  if (studentToTransfer && studentToTransfer.roomId) {
    const currentRoomDetails = await prisma.room.findUnique({
      where: { id: studentToTransfer.roomId },
      select: { buildingId: true, type: true }
    });

    if (currentRoomDetails) {
      const targetRoom = await prisma.room.findFirst({
        where: {
          status: RoomStatus.AVAILABLE, // Or HAS_VACANCY if you implement that
          buildingId: currentRoomDetails.buildingId, // Transfer within the same building for simplicity
          type: currentRoomDetails.type, // Prefer same room type
          id: { not: studentToTransfer.roomId },
          actualOccupancy: { lt: prisma.room.fields.capacity } // Ensure there's actual space
        },
      });

      const approvingStaff = createdStaffProfiles.find(s => s.managedBuildingId === currentRoomDetails.buildingId) || createdStaffProfiles.find(s => s.position?.includes('Quản lý'));

      if (targetRoom && approvingStaff) {
        await prisma.roomTransfer.create({
          data: {
            studentProfileId: studentToTransfer.id,
            fromRoomId: studentToTransfer.roomId,
            toRoomId: targetRoom.id,
            transferDate: new Date(Date.now() + 86400000 * 7), // 7 days from now
            reason: 'Muốn chuyển sang phòng gần bạn bè hơn / phòng thoáng hơn.',
            status: TransferStatus.PENDING,
            // approvedById: approvingStaff.id // Set this if status is APPROVED
          }
        });
        console.log(`Created a PENDING room transfer request for student ${studentToTransfer.studentId} from room ID ${studentToTransfer.roomId} to room ID ${targetRoom.id}.`);
      } else {
        console.log(`Skipping room transfer: Could not find suitable target room (available, same building/type) or approving staff for student ${studentToTransfer.studentId}.`);
      }
    } else {
      console.log(`Skipping room transfer: Could not find current room details for student ${studentToTransfer.studentId}.`);
    }
  } else {
    console.log("Skipping room transfer: Could not find a suitable student (renting, in a room) to create a transfer request.");
  }

  console.log('Seeding finished.');
}

main()
  .catch(async (e) => {
    console.error("Seeding failed:", e);
    await prisma.$disconnect();
    //process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });