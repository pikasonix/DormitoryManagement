import {
  PrismaClient,
  Role,
  Gender,
  RoomType,
  RoomStatus,
  StudentStatus,
  Amenity, // Vẫn giữ lại nếu bạn dùng Amenity ở đâu đó, nhưng không có trong schema mới bạn gửi? => À có Amenity, ok
  PaymentType,
  InvoiceStatus,
  UtilityType,
  MaintenanceStatus,
  TransferStatus,
  VehicleType,
  MediaType, // Thêm MediaType
} from '@prisma/client';
import bcrypt from 'bcryptjs';
import { Decimal } from '@prisma/client/runtime/library'; // Import Decimal

const prisma = new PrismaClient();

// --- Helper Functions ---
function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Helper function to create placeholder media data
function createPlaceholderMediaData(type: MediaType, namePrefix: string, index: number) {
  const ext = 'jpg'; // Giả sử là ảnh jpg
  const filename = `${namePrefix}_${index}_${Date.now()}.${ext}`;

  // Xác định path dựa vào loại media
  let path;
  if (type === MediaType.USER_AVATAR) {
    path = `/uploads/avatar/${filename}`; // Avatar lưu vào thư mục avatar
  } else {
    path = `/uploads/${filename}`; // Các loại khác lưu vào thư mục uploads gốc
  }

  return {
    filename: filename,
    originalFilename: `${namePrefix}_${index}_original.${ext}`,
    path: path,
    mimeType: `image/${ext}`,
    size: Math.floor(Math.random() * (2048 * 1024 - 100 * 1024) + 100 * 1024), // 100KB - 2MB
    mediaType: type,
    alt: `Placeholder image for ${namePrefix} ${index}`,
    isPublic: true,
  };
}


async function main() {
  console.log('Start seeding ...');

  // --- Clean Up Existing Data (Optional but recommended for development) ---
  // Delete in reverse order of dependencies to avoid constraint errors
  console.log('Deleting existing data...');
  // Delete records referencing Media first or records Media references
  await prisma.user.updateMany({ data: { avatarId: null } }); // Disconnect avatar first
  // Now delete other records...
  await prisma.payment.deleteMany();
  await prisma.invoiceItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.utilityMeterReading.deleteMany();
  await prisma.maintenance.deleteMany({ where: {} }); // Xóa Maintenance trước khi xóa Media liên quan
  await prisma.roomTransfer.deleteMany();
  await prisma.vehicleRegistration.deleteMany({ where: {} }); // Xóa VehicleReg trước khi xóa Media liên quan
  await prisma.roomAmenity.deleteMany();
  await prisma.studentProfile.deleteMany({ where: {} }); // Xóa StudentProfile trước User
  await prisma.staffProfile.deleteMany({ where: {} }); // Xóa StaffProfile trước User
  // Delete Media *before* deleting the models it might be linked to via direct relation fields
  await prisma.media.deleteMany({ where: {} }); // <-- Added Media cleanup
  // Delete models that might have relations TO Media (like User's avatarId)
  await prisma.user.deleteMany({ where: {} }); // This should cascade delete profiles if onDelete: Cascade is set
  await prisma.room.deleteMany({ where: {} }); // Xóa Room trước Building
  await prisma.building.deleteMany({ where: {} });
  await prisma.amenity.deleteMany({ where: {} });
  console.log('Existing data deleted.');

  // --- Create Amenities ---
  console.log('Creating amenities...');
  const amenities = await prisma.amenity.createManyAndReturn({
    data: [
      { name: 'Điều hòa', description: 'Máy lạnh làm mát phòng' },
      { name: 'Nóng lạnh', description: 'Bình nước nóng cho sinh hoạt' },
      { name: '2 WC', description: '2 Nhà vệ sinh' },
      { name: '2 Nhà tắm', description: '2 Nhà tắm' },
      { name: 'Tủ đồ cá nhân', description: 'Tủ có khóa riêng cho mỗi sinh viên' },
    ],
  });
  console.log(`Created ${amenities.length} amenities.`);

  // --- Create Buildings ---
  console.log('Creating buildings...');
  const buildingB3 = await prisma.building.create({
    data: {
      name: 'B3',
      address: 'KTX Bách Khoa Hà Nội, Khu B',
      description: 'Tòa nhà dành cho sinh viên nam',
      // Add Building Images using nested create
      images: {
        create: [
          createPlaceholderMediaData(MediaType.BUILDING_IMAGE, 'b3', 1),
          createPlaceholderMediaData(MediaType.BUILDING_IMAGE, 'b3', 2),
        ]
      }
    },
  });
  const buildingB9 = await prisma.building.create({
    data: {
      name: 'B9',
      address: 'KTX Bách Khoa Hà Nội, Khu B',
      description: 'Tòa nhà dành cho sinh viên nữ',
      // Add Building Images using nested create
      images: {
        create: [
          createPlaceholderMediaData(MediaType.BUILDING_IMAGE, 'b9', 1),
        ]
      }
    },
  });
  console.log(`Created buildings: ${buildingB3.name}, ${buildingB9.name}`);

  // --- Create Rooms ---
  console.log('Creating rooms...');
  const rooms: Array<Awaited<ReturnType<typeof prisma.room.create>>> = []; // Explicit type
  const roomTypes = [RoomType.ROOM_8, RoomType.ROOM_6];
  const capacities = { [RoomType.ROOM_8]: 8, [RoomType.ROOM_6]: 6 };
  const prices = { [RoomType.ROOM_8]: new Decimal(600000), [RoomType.ROOM_6]: new Decimal(800000) };
  let roomCounter = 0; // Counter for unique image names

  for (const building of [buildingB3, buildingB9]) {
    for (let floor = 1; floor <= 5; floor++) {
      for (let roomNum = 1; roomNum <= 10; roomNum++) {
        roomCounter++;
        const type = getRandomElement(roomTypes);
        const roomNumberStr = `${floor}0${roomNum}`;
        const room = await prisma.room.create({
          data: {
            buildingId: building.id,
            number: roomNumberStr,
            type: type,
            capacity: capacities[type],
            floor: floor,
            status: RoomStatus.AVAILABLE,
            price: prices[type],
            description: `Phòng ${capacities[type]} người, tầng ${floor}, tòa ${building.name}`,
            // Add Room Image using nested create
            images: {
              create: [
                createPlaceholderMediaData(MediaType.ROOM_IMAGE, `room_${building.name}_${roomNumberStr}`, roomCounter)
              ]
            },
            // Add amenities
            amenities: {
              create: [
                { amenityId: getRandomElement(amenities.filter(a => ['Điều hòa', 'Nóng lạnh'].includes(a.name))).id, quantity: 1 },
                { amenityId: getRandomElement(amenities.filter(a => ['Tủ đồ cá nhân'].includes(a.name))).id, quantity: capacities[type] },
                // Fixed typo: '2 WC', '2 Nhà tắm' not in capacities[type] quantity logic
                { amenityId: getRandomElement(amenities.filter(a => ['2 WC', '2 Nhà tắm'].includes(a.name))).id, quantity: 2 },
              ],
            },
          },
        });
        rooms.push(room);
      }
    }
  }
  console.log(`Created ${rooms.length} rooms.`);

  // --- Create Admin User ---
  console.log('Creating admin user...');
  const adminPassword = await bcrypt.hash('admin123', 10);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {
      password: adminPassword,
      // Add/Update Avatar using nested create/connect (upsert is tricky, let's create if not exists)
      avatar: {
        upsert: { // Use upsert to avoid errors if avatar already exists
          create: createPlaceholderMediaData(MediaType.USER_AVATAR, 'admin_avatar', 1),
          update: {} // No update needed if it exists, could update path/etc if desired
        }
      }
    },
    create: {
      email: 'admin@example.com',
      password: adminPassword,
      role: Role.ADMIN,
      isActive: true,
      // Add Avatar using nested create
      avatar: {
        create: createPlaceholderMediaData(MediaType.USER_AVATAR, 'admin_avatar', 1)
      }
    },
  });
  console.log(`Created admin user: ${adminUser.email}`);

  // --- Create Staff Users and Profiles ---
  console.log('Creating staff users and profiles...');
  const staffPassword = await bcrypt.hash('staff123', 10);
  const staffData = [
    { email: 'staff1@example.com', fullName: 'Nguyễn Văn An', position: 'Quản lý B3', gender: Gender.MALE, managedBuildingId: buildingB3.id },
    { email: 'staff2@example.com', fullName: 'Trần Thị Bình', position: 'Quản lý B9', gender: Gender.FEMALE, managedBuildingId: buildingB9.id },
    { email: 'staff3@example.com', fullName: 'Lê Minh Cường', position: 'Nhân viên kỹ thuật', gender: Gender.MALE, managedBuildingId: null },
  ];
  const createdStaffProfiles: Array<Awaited<ReturnType<typeof prisma.staffProfile.create>>> = [];
  let staffCounter = 0;
  for (const staff of staffData) {
    staffCounter++;
    const user = await prisma.user.create({
      data: {
        email: staff.email,
        password: staffPassword,
        role: Role.STAFF,
        isActive: true,
        // Add Avatar using nested create
        avatar: {
          create: createPlaceholderMediaData(MediaType.USER_AVATAR, `staff_${staff.email.split('@')[0]}`, staffCounter)
        },
        staffProfile: {
          create: {
            fullName: staff.fullName,
            phoneNumber: `0987654${Math.floor(Math.random() * 900) + 100}`,
            position: staff.position,
            identityCardNumber: `0010${Math.floor(Math.random() * 90000000) + 10000000}`, // Example unique ID
            gender: staff.gender,
            birthDate: getRandomDate(new Date(1980, 0, 1), new Date(1995, 11, 31)),
            address: 'Hà Nội',
            managedBuildingId: staff.managedBuildingId,
          },
        },
      },
      include: { staffProfile: true }, // Include the profile in the result
    });
    if (user.staffProfile) {
      createdStaffProfiles.push(user.staffProfile);
    }
    console.log(`Created staff: ${user.email} - ${staff.fullName}`);
  }
  console.log(`Created ${createdStaffProfiles.length} staff profiles.`);
  const assignedStaff = createdStaffProfiles.find(s => s.position === 'Nhân viên kỹ thuật'); // Find the technician

  // --- Create Student Users and Profiles ---
  console.log('Creating student users and profiles...');
  const studentPassword = await bcrypt.hash('student123', 10);
  const firstNamesMale = ['Hùng', 'Dũng', 'Minh', 'Khải', 'Sơn', 'Tuấn', 'Đức', 'Hoàng', 'Nam', 'Quân'];
  const firstNamesFemale = ['Lan', 'Hoa', 'Mai', 'Hương', 'Nga', 'Linh', 'Trang', 'Thảo', 'Hà', 'Thu'];
  const lastNames = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng'];
  const faculties = ['CNTT', 'Điện tử Viễn thông', 'Cơ khí', 'Kinh tế Quản lý', 'Ngoại ngữ', 'Toán tin'];
  const provinces = ['Hà Nội', 'Hải Phòng', 'Đà Nẵng', 'TP HCM', 'Nghệ An', 'Thanh Hóa', 'Hà Tĩnh', 'Nam Định', 'Thái Bình'];

  let availableRooms = await prisma.room.findMany({
    where: { status: { not: RoomStatus.UNDER_MAINTENANCE }, capacity: { gt: 0 } },
    orderBy: { buildingId: 'asc' }
  });
  const createdStudentProfiles: Array<Awaited<ReturnType<typeof prisma.studentProfile.create>>> = [];

  for (let i = 1; i <= 50; i++) {
    if (availableRooms.length === 0) {
      console.warn("No more available rooms to assign students.");
      break;
    }

    const roomIndex = Math.floor(Math.random() * availableRooms.length);
    const assignedRoom = availableRooms[roomIndex];

    const gender = assignedRoom.buildingId === buildingB3.id ? Gender.MALE : Gender.FEMALE;
    const firstName = gender === Gender.MALE ? getRandomElement(firstNamesMale) : getRandomElement(firstNamesFemale);
    const lastName = getRandomElement(lastNames);
    const fullName = `${lastName} ${firstName}`;
    const email = `student${i}@example.com`;
    const studentId = `20${18 + Math.floor(i / 10)}${String(1000 + i).padStart(4, '0')}`; // Ensure 4 digits for ID part
    const courseYear = 63 + Math.floor(i / 15);
    // Generate a more unique ID card number
    const birthDate = getRandomDate(new Date(2000, 0, 1), new Date(2004, 11, 31)); // Declare and initialize birthDate
    const identityCardNumber = `0${String(Math.floor(Math.random() * 99)).padStart(2, '0')}${String(gender === Gender.MALE ? 1 : 0)}${String(birthDate.getFullYear()).slice(-2)}${String(Math.floor(Math.random() * 999999)).padStart(6, '0')}`;


    try {
      const birthDate = getRandomDate(new Date(2000, 0, 1), new Date(2004, 11, 31));
      const identityCardNumber = `0${String(Math.floor(Math.random() * 90) + 10)}${String(gender === Gender.MALE ? 1 : 0)}${String(birthDate.getFullYear()).slice(-2)}${String(Math.floor(Math.random() * 999999)).padStart(6, '0')}`; // More realistic CCCD format

      const user = await prisma.user.create({
        data: {
          email: email,
          password: studentPassword,
          role: Role.STUDENT,
          isActive: true,
          // Add Avatar using nested create
          avatar: {
            create: createPlaceholderMediaData(MediaType.USER_AVATAR, `student_${studentId}`, i)
          },
          studentProfile: {
            create: {
              studentId: studentId,
              fullName: fullName,
              gender: gender,
              birthDate: birthDate, // Use defined birthDate
              identityCardNumber: identityCardNumber, // Use more unique ID
              phoneNumber: `0912345${String(i).padStart(3, '0')}`,
              personalEmail: `personal${i}@mail.com`,
              faculty: getRandomElement(faculties),
              courseYear: courseYear,
              className: `${getRandomElement(faculties).substring(0, 2)}${courseYear}-${String(i % 5 + 1).padStart(2, '0')}`,
              permanentProvince: getRandomElement(provinces),
              permanentAddress: `Số ${i}, Đường ABC, ${getRandomElement(provinces)}`,
              status: StudentStatus.RENTING,
              startDate: getRandomDate(new Date(2023, 8, 1), new Date(2024, 1, 1)),
              contractEndDate: new Date(2025, 5, 30),
              checkInDate: new Date(),
              fatherName: `${getRandomElement(lastNames)} Văn ${getRandomElement(firstNamesMale)}`,
              motherName: `${getRandomElement(lastNames)} Thị ${getRandomElement(firstNamesFemale)}`,
              emergencyContactRelation: 'Bố/Mẹ',
              emergencyContactPhone: `0900000${String(i).padStart(3, '0')}`,
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
          availableRooms.splice(roomIndex, 1);
        }
        console.log(`Created student: ${user.email} - ${fullName} in Room ${assignedRoom.number} (${updatedRoom.actualOccupancy}/${updatedRoom.capacity})`);
      }

    } catch (error: any) {
      if (error.code === 'P2002') {
        console.warn(`Skipping student ${i} (${email}/${studentId}) due to unique constraint violation. Fields: ${error.meta?.target?.join(', ')}`);
      } else {
        console.error(`Failed to create student ${i} (${email}):`, error);
      }
    }
  }
  console.log(`Created ${createdStudentProfiles.length} student profiles.`);

  // --- Create Sample Invoices ---
  console.log('Creating sample invoices...');
  // ... (Invoice creation logic remains largely the same) ...
  // (No direct changes needed here based on the Media model introduction)
  const createdInvoices: Array<Awaited<ReturnType<typeof prisma.invoice.create>>> = [];
  for (const studentProfile of createdStudentProfiles.slice(0, 20)) { // Create invoices for first 20 students
    if (!studentProfile.roomId) continue; // Skip if student isn't in a room

    const room = await prisma.room.findUnique({ where: { id: studentProfile.roomId } });
    if (!room) continue;

    // 1. Room Fee Invoice (Personal)
    const roomFeeInvoice = await prisma.invoice.create({
      data: {
        studentProfileId: studentProfile.id,
        billingMonth: 5,
        billingYear: 2024,
        issueDate: new Date(2024, 4, 1), // May 1st
        dueDate: new Date(2024, 4, 15), // May 15th
        paymentDeadline: new Date(2024, 4, 30), // May 30th
        totalAmount: room.price, // Use room's price
        status: getRandomElement([InvoiceStatus.PAID, InvoiceStatus.UNPAID, InvoiceStatus.OVERDUE]),
        items: {
          create: {
            type: PaymentType.ROOM_FEE,
            description: `Tiền phòng tháng 5/2024 - Phòng ${room.number}`,
            amount: room.price,
          }
        }
      },
      include: { items: true }
    });
    createdInvoices.push(roomFeeInvoice);
    console.log(`Created ROOM_FEE invoice ${roomFeeInvoice.id} for student ${studentProfile.studentId}`);

    // 2. Create payments for PAID invoices
    if (roomFeeInvoice.status === InvoiceStatus.PAID) {
      await prisma.payment.create({
        data: {
          invoiceId: roomFeeInvoice.id,
          studentProfileId: studentProfile.id,
          amount: roomFeeInvoice.totalAmount,
          paymentDate: getRandomDate(roomFeeInvoice.issueDate, roomFeeInvoice.dueDate),
          paymentMethod: getRandomElement(['Chuyển khoản', 'Tiền mặt']),
        }
      });
      console.log(`Created payment for invoice ${roomFeeInvoice.id}`);
      // Update paid amount on invoice
      await prisma.invoice.update({
        where: { id: roomFeeInvoice.id },
        data: { paidAmount: roomFeeInvoice.totalAmount }
      });
    }
  }

  // 3. Utility Invoice (Per Room - Example for one room)
  const roomForUtility = await prisma.room.findFirst({ where: { actualOccupancy: { gt: 0 } } });
  if (roomForUtility) {
    // Create some dummy readings first
    await prisma.utilityMeterReading.createMany({
      data: [
        { roomId: roomForUtility.id, type: UtilityType.ELECTRICITY, readingDate: new Date(2024, 3, 30), indexValue: 1500.5, billingMonth: 4, billingYear: 2024 },
        { roomId: roomForUtility.id, type: UtilityType.ELECTRICITY, readingDate: new Date(2024, 4, 30), indexValue: 1650.0, billingMonth: 5, billingYear: 2024 },
        { roomId: roomForUtility.id, type: UtilityType.WATER, readingDate: new Date(2024, 3, 30), indexValue: 300.0, billingMonth: 4, billingYear: 2024 },
        { roomId: roomForUtility.id, type: UtilityType.WATER, readingDate: new Date(2024, 4, 30), indexValue: 350.0, billingMonth: 5, billingYear: 2024 },
      ]
    });
    console.log(`Created utility readings for Room ${roomForUtility.number}`);

    const electricityAmount = new Decimal((1650.0 - 1500.5) * 3500); // Example calculation
    const waterAmount = new Decimal((350.0 - 300.0) * 15000); // Example calculation
    const totalUtilityAmount = electricityAmount.add(waterAmount);

    const utilityInvoice = await prisma.invoice.create({
      data: {
        roomId: roomForUtility.id, // Linked to room
        billingMonth: 5,
        billingYear: 2024,
        issueDate: new Date(2024, 5, 5), // June 5th
        dueDate: new Date(2024, 5, 20), // June 20th
        paymentDeadline: new Date(2024, 5, 25), // June 25th
        totalAmount: totalUtilityAmount,
        status: InvoiceStatus.UNPAID,
        notes: `Hóa đơn điện nước tháng 5/2024 cho phòng ${roomForUtility.number}`,
        items: {
          create: [
            { type: PaymentType.ELECTRICITY, description: 'Tiền điện T5/2024 (Chỉ số: 1650.0 - 1500.5 = 149.5 kWh)', amount: electricityAmount },
            { type: PaymentType.WATER, description: 'Tiền nước T5/2024 (Chỉ số: 350.0 - 300.0 = 50 m³)', amount: waterAmount },
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
  const roomsWithStudents = await prisma.room.findMany({
    where: { actualOccupancy: { gt: 0 } },
    include: { residents: true }
  });
  let maintenanceCounter = 0;
  if (roomsWithStudents.length > 0 && createdStudentProfiles.length > 0 && assignedStaff) {
    const roomToReport1 = getRandomElement(roomsWithStudents);
    const reportingStudent1 = getRandomElement(roomToReport1.residents);

    if (reportingStudent1) {
      maintenanceCounter++;
      await prisma.maintenance.create({
        data: {
          roomId: roomToReport1.id,
          reportedById: reportingStudent1.id,
          issue: 'Điều hòa bị chảy nước, không mát.',
          reportDate: new Date(),
          status: MaintenanceStatus.PENDING,
          // Add Maintenance Image using nested create
          images: {
            create: [
              createPlaceholderMediaData(MediaType.MAINTENANCE_IMAGE, `maintenance_ac_${roomToReport1.number}`, maintenanceCounter)
            ]
          }
        }
      });
      console.log(`Created maintenance request (AC) for room ${roomToReport1.number}.`);
    } else {
      console.log(`Could not find student in room ${roomToReport1.number} for maintenance request 1.`);
    }

    const roomToReport2 = getRandomElement(roomsWithStudents);
    const reportingStudent2 = getRandomElement(roomToReport2.residents);
    if (reportingStudent2) {
      maintenanceCounter++;
      await prisma.maintenance.create({
        data: {
          roomId: roomToReport2.id,
          reportedById: reportingStudent2.id, // Can be same student reporting again
          issue: 'Bóng đèn nhà vệ sinh bị cháy.',
          reportDate: new Date(Date.now() - 86400000 * 2), // 2 days ago
          status: MaintenanceStatus.ASSIGNED,
          assignedToId: assignedStaff.id, // Assign to the technician
          // Add Maintenance Image using nested create
          images: {
            create: [
              createPlaceholderMediaData(MediaType.MAINTENANCE_IMAGE, `maintenance_light_${roomToReport2.number}`, maintenanceCounter)
            ]
          }
        }
      });
      console.log(`Created maintenance request (Light) for room ${roomToReport2.number}.`);
    } else {
      console.log(`Could not find student in room ${roomToReport2.number} for maintenance request 2.`);
    }

  } else {
    console.log("Skipping maintenance requests creation (no rooms with students, no students, or no assigned staff).");
  }

  // --- Create Sample Vehicle Registration ---
  console.log('Creating vehicle registrations...');
  const studentsForVehicles = createdStudentProfiles.slice(0, 5); // Take first 5 students
  let vehicleCounter = 0;
  for (const student of studentsForVehicles) {
    vehicleCounter++;
    const vehicleType = getRandomElement([VehicleType.MOTORBIKE, VehicleType.BICYCLE]);
    await prisma.vehicleRegistration.create({
      data: {
        studentProfileId: student.id,
        vehicleType: vehicleType,
        licensePlate: vehicleType === VehicleType.MOTORBIKE
          ? `29-${getRandomElement(['H1', 'B1', 'K1'])}-${String(Math.floor(Math.random() * 90000) + 10000).padStart(5, '0')}`
          : `B-${student.studentId}`, // Example license plate for bicycle
        brand: getRandomElement(['Honda', 'Yamaha', 'Thống Nhất', 'Giant']),
        color: getRandomElement(['Đen', 'Trắng', 'Đỏ', 'Xanh']),
        parkingCardNo: `PK${student.studentId}${Math.floor(Math.random() * 10)}`, // Example unique card number
        isActive: true,
        startDate: student.startDate,
        monthlyFee: new Decimal(getRandomElement([50000, 80000])),
        // Add Vehicle Image using nested create
        images: {
          create: [
            createPlaceholderMediaData(MediaType.VEHICLE_IMAGE, `vehicle_${student.studentId}_${vehicleType}`, vehicleCounter)
          ]
        }
      }
    });
  }
  console.log(`Created ${studentsForVehicles.length} vehicle registrations.`);

  // --- Create Sample Room Transfer (Optional) ---
  console.log('Creating a sample room transfer request...');
  // ... (Room Transfer logic remains the same) ...
  // (No direct changes needed here based on the Media model introduction)
  const studentToTransfer = createdStudentProfiles.find(s => s.roomId !== null);
  if (studentToTransfer && studentToTransfer.roomId) {
    const currentRoom = await prisma.room.findUnique({
      where: { id: studentToTransfer.roomId },
      select: { buildingId: true }
    });
    if (currentRoom && currentRoom.buildingId) {
      const currentBuildingId = currentRoom.buildingId;
      const targetRoom = await prisma.room.findFirst({
        where: {
          status: RoomStatus.AVAILABLE,
          buildingId: currentBuildingId,
          id: { not: studentToTransfer.roomId }
        },
      });
      const approvingStaff = createdStaffProfiles.find(s => s.managedBuildingId === currentBuildingId);
      if (targetRoom && approvingStaff) {
        await prisma.roomTransfer.create({
          data: {
            studentProfileId: studentToTransfer.id,
            fromRoomId: studentToTransfer.roomId,
            toRoomId: targetRoom.id,
            transferDate: new Date(Date.now() + 86400000 * 7),
            reason: 'Muốn chuyển sang phòng gần bạn bè hơn.',
            status: TransferStatus.PENDING,
            // approvedById: approvingStaff.id // Uncomment if status is APPROVED
          }
        });
        console.log(`Created a room transfer request for student ${studentToTransfer.studentId} (Room ${studentToTransfer.roomId}) to room ${targetRoom.number}.`);
      } else {
        console.log(`Skipping room transfer: Could not find suitable target room or approving staff for building ${currentBuildingId}.`);
      }
    } else {
      console.log(`Skipping room transfer: Could not find current room details for student ${studentToTransfer.studentId} (roomId: ${studentToTransfer.roomId}).`);
    }
  } else {
    console.log("Skipping room transfer: Could not find any student currently assigned to a room.");
  }

  console.log('Seeding finished.');
}

main()
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    //process.exit(1); // Exit with error code
  })
  .finally(async () => {
    await prisma.$disconnect();
  });