import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { addDays, setHours, setMinutes, startOfDay } from "date-fns";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding CareLoop database...");

  // Clean existing tables
  await prisma.notificationJob.deleteMany();
  await prisma.slotHold.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.doctorLeave.deleteMany();
  await prisma.doctorProfile.deleteMany();
  await prisma.user.deleteMany();

  const hashedAdminPassword = await bcrypt.hash("AdminPass123!", 10);
  const hashedDoctorPassword = await bcrypt.hash("DoctorPass123!", 10);
  const hashedPatientPassword = await bcrypt.hash("PatientPass123!", 10);

  // 1. Create Admin
  const admin = await prisma.user.create({
    data: {
      name: "Clinic Administrator",
      email: "admin@careloop.local",
      password: hashedAdminPassword,
      role: "ADMIN",
      phone: "+1 (555) 000-1111",
    },
  });

  // 2. Create Doctors
  const docUser1 = await prisma.user.create({
    data: {
      name: "Dr. Sarah Smith, MD",
      email: "dr.smith@careloop.local",
      password: hashedDoctorPassword,
      role: "DOCTOR",
      phone: "+1 (555) 101-2020",
    },
  });

  const doctor1 = await prisma.doctorProfile.create({
    data: {
      userId: docUser1.id,
      specialization: "Cardiology",
      bio: "Board-certified Cardiologist with 12+ years of experience in preventative heart care, hypertension, and arrhythmia management.",
      slotDuration: 30,
      workingDays: "1,2,3,4,5", // Mon-Fri
      startHour: 9,
      endHour: 17,
    },
  });

  const docUser2 = await prisma.user.create({
    data: {
      name: "Dr. Rajesh Patel, MD",
      email: "dr.patel@careloop.local",
      password: hashedDoctorPassword,
      role: "DOCTOR",
      phone: "+1 (555) 202-3030",
    },
  });

  const doctor2 = await prisma.doctorProfile.create({
    data: {
      userId: docUser2.id,
      specialization: "Dermatology",
      bio: "Specialist in dermatologic surgery, eczema management, and early skin lesion detection.",
      slotDuration: 30,
      workingDays: "1,2,3,4,5", // Mon-Fri
      startHour: 10,
      endHour: 18,
    },
  });

  // 3. Create Patients
  const patient1 = await prisma.user.create({
    data: {
      name: "Jane Doe",
      email: "patient.jane@careloop.local",
      password: hashedPatientPassword,
      role: "PATIENT",
      phone: "+1 (555) 303-4040",
    },
  });

  const patient2 = await prisma.user.create({
    data: {
      name: "Robert Evans",
      email: "patient.robert@careloop.local",
      password: hashedPatientPassword,
      role: "PATIENT",
      phone: "+1 (555) 404-5050",
    },
  });

  // 4. Create Today's & Upcoming Appointments for Triage Demonstration
  const today = startOfDay(new Date());

  // Appointment 1: High Urgency (Cardiology) - Today 10:00 AM
  const appt1Start = setMinutes(setHours(today, 10), 0);
  const appt1End = setMinutes(setHours(today, 10), 30);
  const appt1 = await prisma.appointment.create({
    data: {
      doctorId: doctor1.id,
      patientId: patient1.id,
      slotStart: appt1Start,
      slotEnd: appt1End,
      status: "CONFIRMED",
      symptomsDuration: "2 days",
      symptomsSeverity: 8,
      symptomsNotes: "Severe crushing chest tightness radiating slightly to left shoulder. Noticeable shortness of breath after climbing stairs.",
      symptomsTags: "chest tightness, shortness of breath, left shoulder",
      urgencyLevel: "High",
      chiefComplaint: "Acute onset substernal chest tightness radiating to left shoulder with exertional dyspnea.",
      suggestedQuestions: JSON.stringify([
        "Did the chest tightness begin abruptly or build up gradually?",
        "Have you experienced associated diaphoresis, nausea, or lightheadedness?",
        "Do you have a personal or family history of coronary artery disease?",
      ]),
      summaryStatus: "pending",
    },
  });

  // Appointment 2: Medium Urgency (Dermatology) - Today 11:30 AM
  const appt2Start = setMinutes(setHours(today, 11), 30);
  const appt2End = setMinutes(setHours(today, 12), 0);
  const appt2 = await prisma.appointment.create({
    data: {
      doctorId: doctor2.id,
      patientId: patient2.id,
      slotStart: appt2Start,
      slotEnd: appt2End,
      status: "CONFIRMED",
      symptomsDuration: "1 week",
      symptomsSeverity: 5,
      symptomsNotes: "Spreading rash with erythema across lower forearm, mild itching and warmth to the touch.",
      symptomsTags: "rash, erythema, forearm, itchiness",
      urgencyLevel: "Medium",
      chiefComplaint: "Erythematous pruritic rash on forearm progressing over 7 days with localized warmth.",
      suggestedQuestions: JSON.stringify([
        "Have you come in contact with new detergents, plants, or topical agents?",
        "Are there any systemic symptoms like fever or swollen lymph nodes?",
        "Has the affected area formed any blisters or weeping exudate?",
      ]),
      summaryStatus: "pending",
    },
  });

  // Appointment 3: Low Urgency Past Visit with Completed AI Post-Visit Summary & Prescription
  const pastDate = addDays(today, -3);
  const pastApptStart = setMinutes(setHours(pastDate, 14), 0);
  const pastApptEnd = setMinutes(setHours(pastDate, 14), 30);
  await prisma.appointment.create({
    data: {
      doctorId: doctor1.id,
      patientId: patient1.id,
      slotStart: pastApptStart,
      slotEnd: pastApptEnd,
      status: "COMPLETED",
      symptomsDuration: "3 weeks",
      symptomsSeverity: 3,
      symptomsNotes: "Routine blood pressure follow-up. Occasional mild morning headaches.",
      symptomsTags: "blood pressure, checkup, morning headache",
      urgencyLevel: "Low",
      chiefComplaint: "Routine hypertension follow-up; reports mild episodic morning headaches.",
      suggestedQuestions: JSON.stringify([
        "What have your home blood pressure readings looked like over the last two weeks?",
        "Are you taking your lisinopril consistently each morning?",
        "Have you experienced any changes in vision or ankle swelling?",
      ]),
      clinicalNotes: "BP 138/86 mmHg. Heart sounds S1/S2 regular. Lungs clear. Advised low sodium diet and regular aerobic exercise. Titrated Lisinopril to 20mg daily.",
      prescription: "Lisinopril 20mg Oral Tablet - 1 tablet every morning with water.\nOmeprazole 20mg - 1 capsule before breakfast if acid reflux occurs.",
      patientSummary: `## 📋 Visit Summary & Diagnosis
We reviewed your blood pressure and morning headaches today. Your resting blood pressure was slightly elevated at 138/86 mmHg. Overall, your cardiovascular check-up was very stable.

---

## 💊 Medication & Care Schedule
- **Lisinopril 20mg:** Take 1 tablet daily in the morning with a full glass of water.
- **Diet & Exercise:** Aim for 30 minutes of walking daily and reduce processed sodium intake.

---

## 🗓️ Next Steps & When to Seek Urgent Care
- **Follow-up:** Check your blood pressure at home 3 times a week and record it. We will review again in 30 days.
- **Warning Signs:** Call the clinic if your home systolic reading exceeds 160 mmHg or if headaches become severe.`,
      summaryStatus: "completed",
    },
  });

  // 5. Create Initial Notification Jobs
  await prisma.notificationJob.create({
    data: {
      appointmentId: appt1.id,
      type: "EMAIL_BOOKING_CONFIRMATION",
      recipient: patient1.email,
      payload: JSON.stringify({
        patientName: patient1.name,
        doctorName: docUser1.name,
        specialization: doctor1.specialization,
        slotTime: "Today at 10:00 AM",
        symptoms: appt1.symptomsNotes,
      }),
      status: "SENT",
      attempts: 1,
    },
  });

  console.log("\n=======================================================");
  console.log("✅ CareLoop Database Seeded Successfully!");
  console.log("=======================================================");
  console.log("🏥 Demo Credentials (use these to log in):");
  console.log("-------------------------------------------------------");
  console.log("👑 ADMIN:   admin@careloop.local       / AdminPass123!");
  console.log("🩺 DOCTOR 1: dr.smith@careloop.local   / DoctorPass123! (Cardiology)");
  console.log("🩺 DOCTOR 2: dr.patel@careloop.local   / DoctorPass123! (Dermatology)");
  console.log("👤 PATIENT: patient.jane@careloop.local / PatientPass123!");
  console.log("=======================================================\n");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
