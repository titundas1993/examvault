import { NextRequest, NextResponse } from "next/server";

let adminDb: any = null;

async function getAdminDb() {
  if (adminDb) return adminDb;
  try {
    const { initializeApp, getApps, cert } = await import("firebase-admin/app");
    const { getFirestore } = await import("firebase-admin/firestore");
    if (getApps().length === 0) {
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const projectId = process.env.FIREBASE_PROJECT_ID || "examvault-7fba8";
      if (privateKey && clientEmail) {
        initializeApp({ credential: cert({ privateKey, clientEmail, projectId }) });
      } else {
        const fs = await import("fs");
        const path = await import("path");
        const keyPath = path.join(process.cwd(), "firebase-admin-key.json");
        if (fs.existsSync(keyPath)) {
          const serviceAccount = JSON.parse(fs.readFileSync(keyPath, "utf8"));
          initializeApp({ credential: cert(serviceAccount) });
        } else {
          throw new Error("No Firebase Admin credentials found.");
        }
      }
    }
    adminDb = getFirestore();
    return adminDb;
  } catch (error) {
    console.error("Firebase Admin init error:", error);
    throw error;
  }
}

// ==================== SEED DATA ====================

const MOCK_TESTS = [
  { title: "WBCS Prelims 2025 - Full Mock", category: "WBCS", subject: "General Studies", duration: 150, marks: 200, questions: 50, isFree: false, price: 99, attempts: 1245, difficulty: "hard", description: "Comprehensive mock test for WBCS Preliminary Examination 2025. Covers History, Geography, Polity, Economy, Science, and Current Affairs as per latest WBCS syllabus.", instructions: "1. Total 150 minutes for 50 questions\n2. Each question carries 4 marks\n3. Negative marking: 1 mark for wrong answer\n4. Do not refresh or close the window during test\n5. Result will be shown after submission", isActive: true },
  { title: "SSC CGL Tier-1 2025 - Mock 1", category: "SSC", subject: "General Intelligence", duration: 60, marks: 100, questions: 25, isFree: true, attempts: 3420, difficulty: "medium", description: "SSC CGL Tier-1 practice mock covering General Intelligence & Reasoning, General Awareness, Quantitative Aptitude, and English Comprehension.", instructions: "1. 60 minutes for 25 questions\n2. Each question carries 4 marks\n3. Negative marking: 1 mark for wrong answer\n4. Attempt all sections", isActive: true },
  { title: "Railway Group D 2025 - Practice Set", category: "Railway", subject: "General Science", duration: 90, marks: 100, questions: 30, isFree: true, attempts: 2156, difficulty: "easy", description: "Railway Group D exam practice set focusing on Mathematics, General Intelligence & Reasoning, General Science, and General Awareness.", instructions: "1. 90 minutes duration\n2. No negative marking\n3. Read each question carefully before answering", isActive: true },
  { title: "IBPS PO Prelims 2025 - Mock Test", category: "Banking", subject: "Reasoning", duration: 60, marks: 100, questions: 30, isFree: false, price: 49, attempts: 1890, difficulty: "hard", description: "IBPS PO Preliminary Examination mock test covering English Language, Quantitative Aptitude, and Reasoning Ability.", instructions: "1. 60 minutes for 3 sections\n2. Section-wise time limit applies\n3. Negative marking: 0.25 marks per wrong answer", isActive: true },
  { title: "UPSC CSAT 2025 - Paper II", category: "UPSC", subject: "Aptitude", duration: 120, marks: 200, questions: 40, isFree: false, price: 149, attempts: 890, difficulty: "hard", description: "UPSC Civil Services Aptitude Test (CSAT) Paper II mock. Covers Comprehension, Interpersonal Skills, Logical Reasoning, Decision Making, and Data Interpretation.", instructions: "1. 120 minutes for 40 questions\n2. Each question carries 5 marks\n3. Negative marking: 1.33 marks for wrong answer\n4. Qualifying paper - 33% marks required", isActive: true },
  { title: "JEXPO 2025 - Physics & Math", category: "JEXPO", subject: "Physics", duration: 90, marks: 100, questions: 30, isFree: true, attempts: 756, difficulty: "medium", description: "JEXPO 2025 practice test for Physics and Mathematics. Designed as per latest WBSCTE syllabus for diploma entrance.", instructions: "1. 90 minutes duration\n2. No negative marking\n3. Focus on accuracy", isActive: true },
  { title: "VOCLET 2025 - Engineering Mock", category: "VOCLET", subject: "Math", duration: 90, marks: 100, questions: 30, isFree: false, price: 39, attempts: 432, difficulty: "medium", description: "VOCLET 2025 lateral entry test practice. Covers Mathematics, Physics, and Engineering fundamentals.", instructions: "1. 90 minutes for 30 questions\n2. Read instructions carefully\n3. No negative marking", isActive: true },
  { title: "WBPSC Clerk 2025 - Mock", category: "PSC", subject: "GK", duration: 60, marks: 100, questions: 25, isFree: true, attempts: 2100, difficulty: "easy", description: "West Bengal Public Service Commission Clerkship Examination mock test. Covers General Knowledge, English, and Arithmetic.", instructions: "1. 60 minutes duration\n2. No negative marking\n3. Answer all questions", isActive: true },
  { title: "SSC CHSL 2025 - Tier 1 Mock", category: "SSC", subject: "English", duration: 60, marks: 100, questions: 25, isFree: false, price: 59, attempts: 1567, difficulty: "medium", description: "SSC Combined Higher Secondary Level Exam Tier-1 mock test. Covers English Language, General Intelligence, Quantitative Aptitude, and General Awareness.", instructions: "1. 60 minutes for 25 questions\n2. Negative marking: 0.5 marks per wrong answer", isActive: true },
  { title: "RRB NTPC CBT-1 2025 - Practice", category: "Railway", subject: "GK", duration: 90, marks: 100, questions: 30, isFree: true, attempts: 3890, difficulty: "medium", description: "RRB NTPC Computer Based Test Stage-1 practice mock. General Awareness, Mathematics, and General Intelligence & Reasoning.", instructions: "1. 90 minutes duration\n2. Negative marking: 1/3 marks per wrong answer\n3. Sections will appear sequentially", isActive: true },
  { title: "SBI PO Prelims 2025 - Mock", category: "Banking", subject: "Quantitative Aptitude", duration: 60, marks: 100, questions: 30, isFree: false, price: 79, attempts: 1230, difficulty: "hard", description: "State Bank of India Probationary Officer Preliminary Exam mock. Covers English, Quantitative Aptitude, and Reasoning.", instructions: "1. 60 minutes for 3 sections\n2. Sectional time limits apply\n3. Negative marking: 0.25 marks", isActive: true },
  { title: "WBCS Prelims 2025 - History Special", category: "WBCS", subject: "History", duration: 45, marks: 80, questions: 20, isFree: true, attempts: 980, difficulty: "medium", description: "WBCS Prelims special mock test focused on Indian History - Ancient, Medieval, and Modern periods with special emphasis on Bengal's history.", instructions: "1. 45 minutes for 20 questions\n2. Each question carries 4 marks\n3. Negative marking: 1 mark for wrong answer", isActive: true },
  { title: "CTET Paper-I 2025 - Mock Test", category: "PSC", subject: "English", duration: 150, marks: 150, questions: 30, isFree: false, price: 69, attempts: 670, difficulty: "easy", description: "Central Teacher Eligibility Test Paper-I mock. Covers Child Development, Language I & II, Mathematics, and Environmental Studies.", instructions: "1. 150 minutes for 30 questions\n2. No negative marking\n3. Focus on pedagogical understanding", isActive: true },
  { title: "RBI Grade B 2025 - Phase I", category: "Banking", subject: "Economy", duration: 120, marks: 200, questions: 40, isFree: false, price: 129, attempts: 560, difficulty: "hard", description: "Reserve Bank of India Grade B Officer Phase-1 mock. General Awareness, English, Quantitative Aptitude, and Reasoning.", instructions: "1. 120 minutes duration\n2. Sectional cut-offs apply\n3. Negative marking: 0.25 marks", isActive: true },
  { title: "SSC MTS 2025 - Practice Set", category: "SSC", subject: "Reasoning", duration: 90, marks: 100, questions: 25, isFree: true, attempts: 4500, difficulty: "easy", description: "SSC Multi-Tasking Staff exam practice set. General Intelligence, Numerical Aptitude, General English, and General Awareness.", instructions: "1. 90 minutes duration\n2. Negative marking: 0.25 marks\n3. Suitable for 10th pass candidates", isActive: true },
];

const QUESTIONS: { question: string; options: string[]; correctAnswer: string; category: string; subject: string; explanation: string; difficulty: string }[] = [
  // WBCS / General Studies
  { question: "Who was the first Governor of West Bengal after independence?", options: ["C. Rajagopalachari", "Kailash Nath Katju", "Padmaja Naidu", "Hare Krishna Mahtab"], correctAnswer: "C. Rajagopalachari", category: "WBCS", subject: "History", explanation: "C. Rajagopalachari served as the first Governor of West Bengal from 1947 to 1948 before becoming the last Governor-General of India.", difficulty: "medium" },
  { question: "The Battle of Plassey was fought in which year?", options: ["1757", "1764", "1857", "1947"], correctAnswer: "1757", category: "WBCS", subject: "History", explanation: "The Battle of Plassey was fought on 23 June 1757 between the British East India Company and the Nawab of Bengal, Siraj-ud-Daulah.", difficulty: "easy" },
  { question: "Which river is known as the 'Sorrow of Bengal'?", options: ["Damodar", "Ganga", "Hooghly", "Teesta"], correctAnswer: "Damodar", category: "WBCS", subject: "Geography", explanation: "The Damodar River was known as the 'Sorrow of Bengal' due to its devastating floods before the construction of the Damodar Valley Corporation dams.", difficulty: "easy" },
  { question: "Sundarbans is famous for which species?", options: ["Bengal Tiger", "Asiatic Lion", "Indian Rhino", "Snow Leopard"], correctAnswer: "Bengal Tiger", category: "WBCS", subject: "Geography", explanation: "The Sundarbans mangrove forest is home to the Royal Bengal Tiger and is a UNESCO World Heritage Site.", difficulty: "easy" },
  { question: "The Indian Constitution was adopted on?", options: ["26 November 1949", "26 January 1950", "15 August 1947", "2 October 1950"], correctAnswer: "26 November 1949", category: "WBCS", subject: "Polity", explanation: "The Constitution of India was adopted on 26 November 1949 and came into effect on 26 January 1950.", difficulty: "medium" },
  { question: "Which article of the Indian Constitution deals with the Right to Equality?", options: ["Article 14", "Article 19", "Article 21", "Article 32"], correctAnswer: "Article 14", category: "WBCS", subject: "Polity", explanation: "Article 14 guarantees equality before law and equal protection of laws within the territory of India.", difficulty: "medium" },
  { question: "What is the GDP growth rate of India in FY 2024-25 (approx)?", options: ["6.5%", "7.2%", "5.8%", "8.1%"], correctAnswer: "6.5%", category: "WBCS", subject: "Economy", explanation: "India's GDP growth rate for FY 2024-25 is estimated at approximately 6.5% as per RBI and government estimates.", difficulty: "medium" },
  { question: "Who is known as the 'Father of the Green Revolution in India'?", options: ["M.S. Swaminathan", "Norman Borlaug", "Verghese Kurien", "Sam Pitroda"], correctAnswer: "M.S. Swaminathan", category: "WBCS", subject: "Economy", explanation: "M.S. Swaminathan is known as the Father of the Green Revolution in India for his role in developing high-yielding wheat varieties.", difficulty: "easy" },

  // SSC / General Intelligence & Reasoning
  { question: "If APPLE is coded as ELPPA, then ORANGE is coded as?", options: ["EGNARO", "ORANGE", "EGANRO", "GNAROE"], correctAnswer: "EGNARO", category: "SSC", subject: "Reasoning", explanation: "The word is reversed. APPLE reversed is ELPPA, so ORANGE reversed is EGNARO.", difficulty: "easy" },
  { question: "Complete the series: 2, 6, 12, 20, 30, ?", options: ["42", "40", "44", "36"], correctAnswer: "42", category: "SSC", subject: "Reasoning", explanation: "The difference between consecutive terms increases by 2: 4, 6, 8, 10, 12. So 30 + 12 = 42.", difficulty: "easy" },
  { question: "In a row of 40 students, Ravi is 7th from the left. What is his position from the right?", options: ["34th", "33rd", "35th", "32nd"], correctAnswer: "34th", category: "SSC", subject: "Reasoning", explanation: "Position from right = Total - Position from left + 1 = 40 - 7 + 1 = 34.", difficulty: "easy" },
  { question: "A is B's sister. C is B's mother. D is C's father. How is A related to D?", options: ["Granddaughter", "Daughter", "Grandmother", "Sister"], correctAnswer: "Granddaughter", category: "SSC", subject: "Reasoning", explanation: "A is B's sister, C is B's mother (so C is also A's mother), D is C's father. So D is A's grandfather, making A D's granddaughter.", difficulty: "medium" },
  { question: "Which number will replace the question mark? 3, 9, 27, 81, ?", options: ["243", "162", "324", "729"], correctAnswer: "243", category: "SSC", subject: "Reasoning", explanation: "Each number is multiplied by 3. 81 × 3 = 243.", difficulty: "easy" },

  // Railway / General Science
  { question: "Which planet is known as the Red Planet?", options: ["Mars", "Venus", "Jupiter", "Saturn"], correctAnswer: "Mars", category: "Railway", subject: "Science", explanation: "Mars appears red due to iron oxide (rust) on its surface, earning it the nickname 'Red Planet'.", difficulty: "easy" },
  { question: "What is the chemical formula of water?", options: ["H2O", "CO2", "NaCl", "O2"], correctAnswer: "H2O", category: "Railway", subject: "Science", explanation: "Water molecule consists of 2 hydrogen atoms and 1 oxygen atom, hence H2O.", difficulty: "easy" },
  { question: "Which gas is most abundant in Earth's atmosphere?", options: ["Nitrogen", "Oxygen", "Carbon Dioxide", "Argon"], correctAnswer: "Nitrogen", category: "Railway", subject: "Science", explanation: "Nitrogen makes up approximately 78% of Earth's atmosphere.", difficulty: "easy" },
  { question: "The unit of electric resistance is?", options: ["Ohm", "Volt", "Ampere", "Watt"], correctAnswer: "Ohm", category: "Railway", subject: "Science", explanation: "Electrical resistance is measured in Ohms, named after Georg Simon Ohm.", difficulty: "easy" },
  { question: "Photosynthesis takes place in which part of the plant?", options: ["Leaves", "Roots", "Stem", "Flowers"], correctAnswer: "Leaves", category: "Railway", subject: "Science", explanation: "Photosynthesis primarily occurs in the leaves which contain chlorophyll pigment.", difficulty: "easy" },
  { question: "What is the speed of light approximately?", options: ["3 × 10⁸ m/s", "3 × 10⁶ m/s", "3 × 10¹⁰ m/s", "3 × 10⁴ m/s"], correctAnswer: "3 × 10⁸ m/s", category: "Railway", subject: "Science", explanation: "The speed of light in vacuum is approximately 3 × 10⁸ meters per second (about 300,000 km/s).", difficulty: "medium" },

  // Banking / Quantitative Aptitude
  { question: "A sum of money doubles itself in 10 years at simple interest. The rate of interest is?", options: ["10%", "5%", "20%", "15%"], correctAnswer: "10%", category: "Banking", subject: "Math", explanation: "If money doubles, interest = principal. SI = P × R × T / 100. So P = P × R × 10 / 100, hence R = 10%.", difficulty: "medium" },
  { question: "The average of first 50 natural numbers is?", options: ["25.5", "25", "26", "26.5"], correctAnswer: "25.5", category: "Banking", subject: "Math", explanation: "Sum of first n natural numbers = n(n+1)/2 = 50×51/2 = 1275. Average = 1275/50 = 25.5.", difficulty: "medium" },
  { question: "If the ratio of A:B is 3:4 and B:C is 6:7, then A:B:C is?", options: ["9:12:14", "3:4:7", "3:6:7", "9:12:7"], correctAnswer: "9:12:14", category: "Banking", subject: "Math", explanation: "Make B equal: A:B = 3:4 = 9:12, B:C = 6:7 = 12:14. Combined: A:B:C = 9:12:14.", difficulty: "medium" },
  { question: "A train 200m long running at 72 km/h crosses a platform 300m long in how many seconds?", options: ["25 seconds", "20 seconds", "30 seconds", "15 seconds"], correctAnswer: "25 seconds", category: "Banking", subject: "Math", explanation: "Speed = 72 km/h = 20 m/s. Total distance = 200 + 300 = 500m. Time = 500/20 = 25 seconds.", difficulty: "medium" },

  // UPSC / Current Affairs & Advanced
  { question: "Which country hosted the G20 Summit in 2023?", options: ["India", "Indonesia", "Brazil", "Japan"], correctAnswer: "India", category: "UPSC", subject: "GK", explanation: "India hosted the G20 Summit in September 2023 in New Delhi under its presidency.", difficulty: "easy" },
  { question: "The Chandrayaan-3 mission landed near which location on the Moon?", options: ["South Pole", "North Pole", "Equator", "Near Side"], correctAnswer: "South Pole", category: "UPSC", subject: "GK", explanation: "Chandrayaan-3's Vikram lander successfully soft-landed near the lunar south pole on August 23, 2023.", difficulty: "medium" },
  { question: "Which amendment is known as the Mini Constitution of India?", options: ["42nd Amendment", "44th Amendment", "73rd Amendment", "86th Amendment"], correctAnswer: "42nd Amendment", category: "UPSC", subject: "Polity", explanation: "The 42nd Amendment Act (1976) is known as the 'Mini Constitution' due to the sweeping changes it made to the Constitution.", difficulty: "hard" },
  { question: "The Panchayati Raj system was constitutionalized by which amendment?", options: ["73rd Amendment", "74th Amendment", "72nd Amendment", "71st Amendment"], correctAnswer: "73rd Amendment", category: "UPSC", subject: "Polity", explanation: "The 73rd Constitutional Amendment Act (1992) gave constitutional status to Panchayati Raj institutions.", difficulty: "medium" },

  // English
  { question: "Choose the correct synonym of 'Benevolent':", options: ["Kind", "Cruel", "Angry", "Lazy"], correctAnswer: "Kind", category: "SSC", subject: "English", explanation: "Benevolent means well-meaning, kindly, or charitable.", difficulty: "easy" },
  { question: "Choose the correct antonym of 'Abundant':", options: ["Scarce", "Plenty", "Sufficient", "Ample"], correctAnswer: "Scarce", category: "SSC", subject: "English", explanation: "Abundant means available in large quantities; scarce means insufficient or rare.", difficulty: "easy" },
  { question: "Fill in the blank: She ___ to the market yesterday.", options: ["went", "goes", "going", "gone"], correctAnswer: "went", category: "SSC", subject: "English", explanation: "With 'yesterday' (past time indicator), simple past tense 'went' is correct.", difficulty: "easy" },
  { question: "Identify the error: 'One of the boy is absent today.'", options: ["Replace 'boy' with 'boys'", "Replace 'is' with 'are'", "Replace 'one' with 'a'", "No error"], correctAnswer: "Replace 'boy' with 'boys'", category: "SSC", subject: "English", explanation: "'One of the' is followed by a plural noun. Correct: 'One of the boys is absent today.'", difficulty: "medium" },

  // Math
  { question: "What is 25% of 480?", options: ["120", "140", "100", "160"], correctAnswer: "120", category: "SSC", subject: "Math", explanation: "25% of 480 = (25/100) × 480 = 0.25 × 480 = 120.", difficulty: "easy" },
  { question: "The LCM of 12, 18, and 24 is?", options: ["72", "144", "36", "48"], correctAnswer: "72", category: "SSC", subject: "Math", explanation: "12 = 2² × 3, 18 = 2 × 3², 24 = 2³ × 3. LCM = 2³ × 3² = 8 × 9 = 72.", difficulty: "medium" },
  { question: "If x + y = 12 and xy = 32, then x² + y² = ?", options: ["80", "64", "112", "96"], correctAnswer: "80", category: "Banking", subject: "Math", explanation: "x² + y² = (x + y)² - 2xy = 144 - 64 = 80.", difficulty: "medium" },
  { question: "A shopkeeper gives a discount of 20% and still makes a profit of 25%. If the cost price is Rs. 400, find the marked price.", options: ["Rs. 625", "Rs. 500", "Rs. 600", "Rs. 480"], correctAnswer: "Rs. 625", category: "Banking", subject: "Math", explanation: "SP = 400 × 1.25 = 500. SP = MP × 0.8. So MP = 500/0.8 = Rs. 625.", difficulty: "hard" },
  { question: "How many prime numbers are there between 1 and 50?", options: ["15", "14", "16", "13"], correctAnswer: "15", category: "SSC", subject: "Math", explanation: "Primes: 2,3,5,7,11,13,17,19,23,29,31,37,41,43,47 = 15 prime numbers.", difficulty: "medium" },

  // Computer
  { question: "What does CPU stand for?", options: ["Central Processing Unit", "Computer Personal Unit", "Central Program Utility", "Computer Processing Utility"], correctAnswer: "Central Processing Unit", category: "SSC", subject: "Computer", explanation: "CPU stands for Central Processing Unit, the primary component that executes instructions.", difficulty: "easy" },
  { question: "1 KB (Kilobyte) is equal to?", options: ["1024 bytes", "1000 bytes", "512 bytes", "2048 bytes"], correctAnswer: "1024 bytes", category: "SSC", subject: "Computer", explanation: "In binary, 1 KB = 2¹⁰ = 1024 bytes.", difficulty: "easy" },

  // Geography
  { question: "Which is the longest river in India?", options: ["Ganga", "Godavari", "Brahmaputra", "Yamuna"], correctAnswer: "Ganga", category: "WBCS", subject: "Geography", explanation: "The Ganga is the longest river in India at approximately 2,525 km.", difficulty: "easy" },
  { question: "The Tropic of Cancer passes through how many Indian states?", options: ["8", "7", "9", "6"], correctAnswer: "8", category: "UPSC", subject: "Geography", explanation: "The Tropic of Cancer passes through 8 Indian states: Gujarat, Rajasthan, MP, Chhattisgarh, Jharkhand, WB, Tripura, and Mizoram.", difficulty: "hard" },
  { question: "Which Indian state has the largest area?", options: ["Rajasthan", "Madhya Pradesh", "Maharashtra", "Uttar Pradesh"], correctAnswer: "Rajasthan", category: "SSC", subject: "Geography", explanation: "Rajasthan is the largest state in India by area (342,239 sq km).", difficulty: "easy" },

  // Economy
  { question: "Who is the current Governor of RBI (2025)?", options: ["Shaktikanta Das", "Raghuram Rajan", "Urjit Patel", "D. Subbarao"], correctAnswer: "Shaktikanta Das", category: "Banking", subject: "Economy", explanation: "Shaktikanta Das has been serving as the 25th Governor of the Reserve Bank of India since December 2018.", difficulty: "easy" },
  { question: "What is India's rank in terms of GDP (nominal) globally?", options: ["5th", "3rd", "7th", "2nd"], correctAnswer: "5th", category: "Banking", subject: "Economy", explanation: "India is the 5th largest economy in the world by nominal GDP as of 2024.", difficulty: "medium" },

  // GK
  { question: "Which Indian city is known as the 'City of Joy'?", options: ["Kolkata", "Mumbai", "Delhi", "Chennai"], correctAnswer: "Kolkata", category: "WBCS", subject: "GK", explanation: "Kolkata is popularly known as the 'City of Joy', a name popularized by Dominique Lapierre's book.", difficulty: "easy" },
  { question: "The national animal of India is?", options: ["Bengal Tiger", "Peacock", "Elephant", "Lion"], correctAnswer: "Bengal Tiger", category: "SSC", subject: "GK", explanation: "The Royal Bengal Tiger is the national animal of India.", difficulty: "easy" },
  { question: "Who wrote the Indian national anthem 'Jana Gana Mana'?", options: ["Rabindranath Tagore", "Bankim Chandra Chattopadhyay", "Sarojini Naidu", "Mahatma Gandhi"], correctAnswer: "Rabindranath Tagore", category: "WBCS", subject: "GK", explanation: "Jana Gana Mana was written by Rabindranath Tagore and was adopted as India's national anthem on January 24, 1950.", difficulty: "easy" },
  { question: "Which is the highest civilian award in India?", options: ["Bharat Ratna", "Padma Vibhushan", "Padma Bhushan", "Padma Shri"], correctAnswer: "Bharat Ratna", category: "UPSC", subject: "GK", explanation: "Bharat Ratna is the highest civilian award in India, instituted in 1954.", difficulty: "easy" },
  { question: "How many states are there in India (2025)?", options: ["28", "29", "30", "27"], correctAnswer: "28", category: "SSC", subject: "GK", explanation: "India currently has 28 states and 8 Union Territories.", difficulty: "easy" },
  { question: "Which festival is known as the 'Festival of Lights'?", options: ["Diwali", "Holi", "Eid", "Christmas"], correctAnswer: "Diwali", category: "SSC", subject: "GK", explanation: "Diwali, the Festival of Lights, is one of the most celebrated festivals in India.", difficulty: "easy" },
];

const FREE_TESTS = [
  { title: "WBCS Free Practice Set 1", category: "WBCS", subject: "General Studies", duration: 30, marks: 40, questions: 10, isFree: true, attempts: 5200, difficulty: "easy", description: "Free WBCS practice test covering basic General Studies questions. Perfect for beginners.", instructions: "1. 30 minutes for 10 questions\n2. No negative marking\n3. Good luck!", isActive: true },
  { title: "SSC Free GK Challenge", category: "SSC", subject: "GK", duration: 20, marks: 40, questions: 10, isFree: true, attempts: 8900, difficulty: "easy", description: "Free SSC GK quiz. Test your general knowledge with these commonly asked SSC questions.", instructions: "1. 20 minutes for 10 questions\n2. No negative marking", isActive: true },
  { title: "Railway Free Mock - General Science", category: "Railway", subject: "Science", duration: 25, marks: 40, questions: 10, isFree: true, attempts: 6700, difficulty: "easy", description: "Free Railway exam practice focusing on General Science topics.", instructions: "1. 25 minutes for 10 questions\n2. No negative marking", isActive: true },
  { title: "Banking Awareness Free Test", category: "Banking", subject: "Economy", duration: 20, marks: 40, questions: 10, isFree: true, attempts: 3400, difficulty: "medium", description: "Free banking awareness test for IBPS, SBI, and RBI exam aspirants.", instructions: "1. 20 minutes for 10 questions\n2. No negative marking", isActive: true },
  { title: "India GK - Free Quiz", category: "UPSC", subject: "GK", duration: 15, marks: 40, questions: 10, isFree: true, attempts: 11000, difficulty: "easy", description: "Free India General Knowledge quiz. Questions about Indian history, geography, and culture.", instructions: "1. 15 minutes for 10 questions\n2. No negative marking", isActive: true },
];

const DAILY_QUIZ = [
  { title: "Today's GK Quiz - June 2025", category: "GK", subject: "Current Affairs", duration: 10, marks: 20, questions: 5, isFree: true, participants: 2340, difficulty: "easy", description: "Daily current affairs quiz for competitive exam preparation.", isActive: true },
  { title: "Math Challenge of the Day", category: "SSC", subject: "Math", duration: 15, marks: 20, questions: 5, isFree: true, participants: 1560, difficulty: "medium", description: "Sharpen your quantitative skills with today's math challenge.", isActive: true },
  { title: "English Vocabulary Builder", category: "SSC", subject: "English", duration: 10, marks: 20, questions: 5, isFree: true, participants: 980, difficulty: "easy", description: "Build your English vocabulary with daily new words and their usage.", isActive: true },
  { title: "History Flash Quiz", category: "WBCS", subject: "History", duration: 10, marks: 20, questions: 5, isFree: true, participants: 870, difficulty: "medium", description: "Quick history quiz covering important events and dates.", isActive: true },
  { title: "Science Snippets - Daily", category: "Railway", subject: "Science", duration: 10, marks: 20, questions: 5, isFree: true, participants: 1230, difficulty: "easy", description: "Daily science quiz covering physics, chemistry, and biology basics.", isActive: true },
  { title: "Reasoning Quick Fire", category: "SSC", subject: "Reasoning", duration: 10, marks: 20, questions: 5, isFree: true, participants: 1890, difficulty: "medium", description: "Test your logical reasoning with today's quick fire round.", isActive: true },
  { title: "Polity Power Quiz", category: "UPSC", subject: "Polity", duration: 10, marks: 20, questions: 5, isFree: true, participants: 560, difficulty: "hard", description: "Indian Constitution and governance quiz for serious aspirants.", isActive: true },
];

const TEST_SERIES = [
  { title: "WBCS 2025 Complete Pack", category: "WBCS", subject: "General Studies", totalTests: 12, isFree: false, price: 499, description: "Complete WBCS 2025 preparation pack with 12 full-length mock tests covering all subjects.", isActive: true },
  { title: "SSC CGL 2025 Full Course", category: "SSC", subject: "General Intelligence", totalTests: 10, isFree: false, price: 399, description: "Comprehensive SSC CGL 2025 test series with 10 mock tests and detailed solutions.", isActive: true },
  { title: "Railway Exam Master Pack", category: "Railway", subject: "General Science", totalTests: 8, isFree: false, price: 299, description: "8 mock tests for RRB NTPC, Group D, and ALP exams with detailed explanations.", isActive: true },
  { title: "Banking Exam Combo 2025", category: "Banking", subject: "Reasoning", totalTests: 10, isFree: false, price: 449, description: "Complete banking exam pack covering IBPS PO, SBI PO, and RBI Grade B patterns.", isActive: true },
  { title: "UPSC Prelims 2025 Pack", category: "UPSC", subject: "GK", totalTests: 15, isFree: false, price: 799, description: "15 UPSC-level mock tests with CSAT papers for comprehensive preparation.", isActive: true },
  { title: "JEXPO + VOCLET Combo", category: "JEXPO", subject: "Physics", totalTests: 6, isFree: true, description: "6 practice tests for JEXPO and VOCLET combined preparation.", isActive: true },
];

const POPULAR_TESTS = [
  { title: "WBCS Prelims 2025 - Most Popular", category: "WBCS", subject: "General Studies", duration: 120, marks: 200, questions: 40, isFree: false, price: 99, attempts: 5600, difficulty: "hard", description: "Most attempted WBCS mock test with detailed analysis.", isActive: true },
  { title: "SSC CGL Top Rated Mock", category: "SSC", subject: "General Intelligence", duration: 60, marks: 100, questions: 25, isFree: true, attempts: 12000, difficulty: "medium", description: "Highest rated SSC CGL mock test by students.", isActive: true },
  { title: "Railway Most Attempted", category: "Railway", subject: "GK", duration: 60, marks: 100, questions: 20, isFree: true, attempts: 8900, difficulty: "easy", description: "Most popular Railway exam practice test.", isActive: true },
  { title: "Banking Bestseller Mock", category: "Banking", subject: "Economy", duration: 45, marks: 80, questions: 20, isFree: false, price: 49, attempts: 4500, difficulty: "medium", description: "Bestselling banking mock test with detailed solutions.", isActive: true },
  { title: "India GK Mega Quiz", category: "UPSC", subject: "GK", duration: 30, marks: 60, questions: 15, isFree: true, attempts: 15000, difficulty: "easy", description: "Mega GK quiz covering everything Indian - history, geography, culture.", isActive: true },
];

const BANNERS = [
  { title: "WBCS 2025 Registration Open!", gradient: "from-blue-900 via-indigo-800 to-purple-900", linkType: "internal", targetView: "mocktests", isActive: true, order: 0 },
  { title: "Free Tests Available - Start Now!", gradient: "from-green-700 via-emerald-600 to-teal-500", linkType: "internal", targetView: "free-tests", isActive: true, order: 1 },
  { title: "SSC CGL 2025 Notification Out", gradient: "from-orange-600 via-red-500 to-pink-500", linkType: "internal", targetView: "mocktests", isActive: true, order: 2 },
  { title: "Daily Quiz - Play & Learn!", gradient: "from-purple-700 via-violet-600 to-indigo-500", linkType: "internal", targetView: "free-quizzes", isActive: true, order: 3 },
];

const ANNOUNCEMENTS = [
  { title: "WBCS 2025 Prelims Date Announced", description: "West Bengal Public Service Commission has announced the WBCS 2025 Preliminary Examination date. Check official website for details and start your preparation with our mock tests.", type: "exam_update", priority: "high", isActive: true },
  { title: "New SSC CGL Mock Tests Added", description: "We have added 5 new SSC CGL Tier-1 mock tests as per the latest exam pattern. Practice now and boost your score!", type: "new_content", priority: "medium", isActive: true },
  { title: "Railway Group D Result Declared", description: "RRB has declared the Group D exam results. Check your score and start preparing for the next stage with our comprehensive test series.", type: "result", priority: "high", isActive: true },
  { title: "Free Study Materials Updated", description: "New free study materials and notes have been added for History, Geography, and Polity. Access them from the Notes section.", type: "update", priority: "low", isActive: true },
  { title: "Banking Awareness Week - Special Offer", description: "Get 30% off on all Banking exam test series this week! Use code BANK30 at checkout. Limited time offer.", type: "offer", priority: "medium", isActive: true },
];

const UPCOMING_EXAMS = [
  { name: "WBCS Prelims 2025", examDate: "2025-08-15", category: "WBCS", description: "West Bengal Civil Service Preliminary Examination 2025. Apply online through WBPSC official website.", officialWebsite: "https://wbpsc.gov.in", isActive: true },
  { name: "SSC CGL 2025 Tier-1", examDate: "2025-09-01", category: "SSC", description: "Staff Selection Commission Combined Graduate Level Examination 2025. Registration starts from June 2025.", officialWebsite: "https://ssc.nic.in", isActive: true },
  { name: "RRB NTPC CBT-1 2025", examDate: "2025-07-20", category: "Railway", description: "Railway Recruitment Board Non-Technical Popular Categories Computer Based Test 2025.", officialWebsite: "https://rrcb.gov.in", isActive: true },
  { name: "IBPS PO Prelims 2025", examDate: "2025-10-05", category: "Banking", description: "Institute of Banking Personnel Selection Probationary Officer Preliminary Exam 2025.", officialWebsite: "https://ibps.in", isActive: true },
  { name: "UPSC Civil Services Prelims 2025", examDate: "2025-05-25", category: "UPSC", description: "Union Public Service Commission Civil Services Preliminary Examination 2025.", officialWebsite: "https://upsc.gov.in", isActive: true },
  { name: "JEXPO 2025", examDate: "2025-06-10", category: "JEXPO", description: "Joint Entrance Examination for Polytechnic Courses 2025 by WBSCTE.", officialWebsite: "https://webscte.co.in", isActive: true },
  { name: "SBI PO Prelims 2025", examDate: "2025-11-01", category: "Banking", description: "State Bank of India Probationary Officer Preliminary Examination 2025.", officialWebsite: "https://sbi.co.in", isActive: true },
];

const DAILY_TIPS = [
  { title: "How to Prepare for WBCS While Working", description: "Many WBCS aspirants prepare while working full-time. Here's how you can manage: 1) Dedicate 2-3 hours daily - early morning is best. 2) Use weekends for mock tests. 3) Focus on high-weightage topics first. 4) Use commute time for audio lectures. 5) Join a study group for accountability. Remember, consistency beats intensity!", category: "study", referenceLink: "", isActive: true },
  { title: "5 Memory Techniques for Competitive Exams", description: "Struggling to remember facts? Try these proven techniques: 1) Spaced Repetition - review at increasing intervals. 2) Mind Maps - connect related concepts visually. 3) The Method of Loci - associate facts with familiar locations. 4) Chunking - break large info into smaller groups. 5) Active Recall - test yourself instead of re-reading. These methods are scientifically proven to boost retention by up to 200%!", category: "study", referenceLink: "", isActive: true },
  { title: "Time Management During SSC CGL Exam", description: "Time management is crucial for SSC CGL success: 1) Spend max 2 minutes per question. 2) Attempt easy questions first, mark difficult ones for later. 3) Don't get stuck on any single question. 4) Keep last 5 minutes for review. 5) Practice with a timer at home to build speed. Section-wise strategy: Start with GK (quick), then English, then Reasoning, save Math for last as it's most time-consuming.", category: "time-management", referenceLink: "", isActive: true },
  { title: "Stay Motivated During Long Exam Prep", description: "Long preparation journeys can be demotivating. Here's how to stay on track: 1) Set small weekly goals instead of looking at the big picture. 2) Celebrate small wins - completed a chapter? Treat yourself! 3) Visualize your success daily. 4) Take regular breaks - burnout is real. 5) Connect with fellow aspirants for support. 6) Remember why you started. Every topper went through the same phase!", category: "motivation", referenceLink: "", isActive: true },
  { title: "Current Affairs Preparation Strategy", description: "Current affairs can make or break your exam: 1) Read a national newspaper daily (The Hindu/Indian Express). 2) Make monthly current affairs notes. 3) Focus on: government schemes, international events, sports, awards, appointments. 4) Revise last 6 months before exam. 5) Practice with daily quizzes. 6) Use apps like PIB for authentic government news. Remember: Quality over quantity - understand the context, don't just memorize dates!", category: "exam-strategy", referenceLink: "", isActive: true },
  { title: "How to Avoid Negative Marking Traps", description: "Negative marking can destroy your score! Smart strategies: 1) If you're 70%+ sure, attempt it. 2) Eliminate obviously wrong options first. 3) Never guess randomly on hard questions. 4) In exams like WBCS (1 mark negative), be extra cautious. 5) In exams like IBPS (0.25 negative), calculated risks are okay. 6) Practice with negative marking at home to build the right instinct. Rule of thumb: When in doubt, leave it out!", category: "exam-strategy", referenceLink: "", isActive: true },
];

const PREVIOUS_PAPERS = [
  { name: "WBCS Prelims 2024 - General Studies", title: "WBCS Prelims 2024", category: "WBCS", year: "2024", isFree: true, description: "Official WBCS 2024 Preliminary Examination General Studies paper with answer key.", isActive: true },
  { name: "SSC CGL Tier-1 2023 - Full Paper", title: "SSC CGL 2023", category: "SSC", year: "2023", isFree: true, description: "Complete SSC CGL Tier-1 2023 question paper with detailed solutions.", isActive: true },
  { name: "RRB NTPC CBT-1 2022", title: "RRB NTPC 2022", category: "Railway", year: "2022", isFree: false, price: 29, description: "RRB NTPC CBT-1 2022 question paper with answer key and explanations.", isActive: true },
  { name: "IBPS PO Prelims 2024", title: "IBPS PO 2024", category: "Banking", year: "2024", isFree: false, price: 39, description: "IBPS PO 2024 Prelims paper with section-wise analysis and solutions.", isActive: true },
];

const NOTES = [
  { title: "Indian History - Complete Notes", category: "WBCS", subject: "History", author: "ExamVault Team", language: "English", isFree: true, description: "Comprehensive Indian History notes covering Ancient, Medieval, and Modern India. Special focus on Bengal's history, freedom movement, and post-independence era. Includes timelines, key events, and important personalities.", topics: "Ancient India, Medieval Period, Mughal Empire, British Rule, Freedom Struggle, Post-Independence India", pages: 120, isActive: true },
  { title: "Indian Geography - Study Material", category: "SSC", subject: "Geography", author: "ExamVault Team", language: "English", isFree: true, description: "Complete Indian Geography notes covering Physical, Economic, and Human Geography. Includes maps, climate data, river systems, and mineral resources of India.", topics: "Physical Geography, Climate, Rivers, Minerals, Agriculture, Industries, Population", pages: 95, isActive: true },
  { title: "Indian Constitution & Polity", category: "UPSC", subject: "Polity", author: "ExamVault Team", language: "Bengali", isFree: false, price: 49, description: "Detailed notes on the Indian Constitution, Fundamental Rights, Directive Principles, and governance structure. Written in Bengali for WBCS and PSC aspirants.", topics: "Preamble, Fundamental Rights, DPSP, Parliament, Judiciary, Amendments, Panchayati Raj", pages: 80, isActive: true },
  { title: "Indian Economy - Key Concepts", category: "Banking", subject: "Economy", author: "ExamVault Team", language: "English", isFree: true, description: "Essential Indian Economy notes covering GDP, Fiscal Policy, Monetary Policy, Banking System, and Economic Reforms. Updated with latest budget highlights.", topics: "GDP, Fiscal Policy, RBI, Banking, Taxation, Budget 2025, Economic Reforms", pages: 65, isActive: true },
];

const PLANS = [
  { name: "Free Plan", price: 0, type: "free", duration: 0, features: "Access to Free Tests,Daily Quiz,Basic Notes,Limited Previous Papers", isActive: true, description: "Start your preparation with free access to basic tests and study materials." },
  { name: "Silver Plan", price: 199, type: "monthly", duration: 30, features: "All Free Plan features,5 Mock Tests per month,Detailed Solutions,Previous Papers Access", isActive: true, description: "Perfect for beginners who want more practice with detailed solutions." },
  { name: "Gold Plan", price: 499, type: "monthly", duration: 30, features: "All Silver features,Unlimited Mock Tests,Full Test Series Access,Priority Support,Ad-free Experience", isActive: true, description: "Most popular plan for serious aspirants with unlimited access." },
  { name: "Platinum Plan", price: 999, type: "yearly", duration: 365, features: "All Gold features,1 Year Access,Personalized Study Plan,1-on-1 Doubt Sessions,Certificate on Completion", isActive: true, description: "Ultimate preparation package with personalized guidance and 1 year access." },
];

const NAVIGATION_ITEMS = [
  { label: "Home", icon: "Home", targetView: "home", location: "bottomnav", order: 0, isActive: true, color: "text-ev-navy", requireAuth: false },
  { label: "Mock Tests", icon: "BookOpen", targetView: "mocktests", location: "bottomnav", order: 1, isActive: true, color: "text-blue-600", requireAuth: false },
  { label: "Leaderboard", icon: "Award", targetView: "leaderboard", location: "bottomnav", order: 2, isActive: true, color: "text-amber-600", requireAuth: false },
  { label: "Notes", icon: "Notebook", targetView: "notes", location: "bottomnav", order: 3, isActive: true, color: "text-teal-600", requireAuth: false },
  { label: "Profile", icon: "User", targetView: "profile", location: "bottomnav", order: 4, isActive: true, color: "text-ev-navy", requireAuth: false },
  { label: "Home", icon: "Home", targetView: "home", location: "sidemenu", order: 0, isActive: true, color: "text-ev-navy", requireAuth: false },
  { label: "Mock Tests", icon: "BookOpen", targetView: "mocktests", location: "sidemenu", order: 1, isActive: true, color: "text-blue-600", requireAuth: false },
  { label: "Premium Plans", icon: "Crown", targetView: "pricing", location: "sidemenu", order: 2, isActive: true, color: "text-ev-gold", requireAuth: false },
  { label: "Free Tests", icon: "Zap", targetView: "free-tests", location: "sidemenu", order: 3, isActive: true, color: "text-ev-green", requireAuth: false },
  { label: "Free Quizzes", icon: "Brain", targetView: "free-quizzes", location: "sidemenu", order: 4, isActive: true, color: "text-purple-600", requireAuth: false },
  { label: "Previous Papers", icon: "FileText", targetView: "previous-papers", location: "sidemenu", order: 5, isActive: true, color: "text-ev-orange", requireAuth: false },
  { label: "Upcoming Exams", icon: "CalendarDays", targetView: "upcoming-exams", location: "sidemenu", order: 6, isActive: true, color: "text-cyan-600", requireAuth: false },
  { label: "Daily Tips", icon: "Sparkles", targetView: "daily-tips", location: "sidemenu", order: 7, isActive: true, color: "text-amber-600", requireAuth: false },
  { label: "Notes", icon: "Notebook", targetView: "notes", location: "sidemenu", order: 8, isActive: true, color: "text-teal-600", requireAuth: false },
  { label: "Leaderboard", icon: "Award", targetView: "leaderboard", location: "sidemenu", order: 9, isActive: true, color: "text-amber-600", requireAuth: false },
  { label: "Profile", icon: "User", targetView: "profile", location: "sidemenu", order: 10, isActive: true, color: "text-ev-navy", requireAuth: false },
  { label: "Settings", icon: "Settings", targetView: "settings", location: "sidemenu", order: 11, isActive: true, color: "text-gray-600", requireAuth: false },
  { label: "Support", icon: "HelpCircle", targetView: "support", location: "sidemenu", order: 12, isActive: true, color: "text-ev-orange", requireAuth: false },
  { label: "Free Tests", icon: "Zap", targetView: "free-tests", location: "quicklinks", order: 0, isActive: true, color: "text-ev-green", requireAuth: false },
  { label: "Test Series", icon: "Trophy", targetView: "test-series", location: "quicklinks", order: 1, isActive: true, color: "text-ev-gold", requireAuth: false },
  { label: "Previous Papers", icon: "FileText", targetView: "previous-papers", location: "quicklinks", order: 2, isActive: true, color: "text-ev-orange", requireAuth: false },
  { label: "Notes", icon: "Notebook", targetView: "notes", location: "quicklinks", order: 3, isActive: true, color: "text-purple-600", requireAuth: false },
];

// ==================== SEED FUNCTION ====================

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    const adminToken = process.env.ADMIN_TOKEN || "examvault-admin-2025";
    if (token !== adminToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getAdminDb();
    const results: Record<string, number> = {};

    // Helper to add a batch of documents
    async function seedCollection(collectionName: string, items: any[]) {
      let count = 0;
      for (const item of items) {
        try {
          const docRef = db.collection(collectionName).doc();
          await docRef.set({ ...item, id: docRef.id, createdAt: new Date().toISOString() });
          count++;
        } catch (e) {
          console.error(`Error seeding ${collectionName}:`, e);
        }
      }
      results[collectionName] = count;
    }

    // Helper to add questions linked to tests
    async function seedQuestions(collectionName: string, items: any[]) {
      let count = 0;
      for (const item of items) {
        try {
          const docRef = db.collection(collectionName).doc();
          await docRef.set({
            ...item,
            id: docRef.id,
            type: "mcq",
            options: item.options.map((text: string, index: number) => ({
              key: String.fromCharCode(65 + index), // A, B, C, D
              text,
            })),
            createdAt: new Date().toISOString(),
          });
          count++;
        } catch (e) {
          console.error(`Error seeding question:`, e);
        }
      }
      results[collectionName] = count;
    }

    // Seed all collections
    await seedCollection("mockTests", MOCK_TESTS);
    await seedCollection("freeTests", FREE_TESTS);
    await seedCollection("dailyQuiz", DAILY_QUIZ);
    await seedCollection("testSeries", TEST_SERIES);
    await seedCollection("popularTests", POPULAR_TESTS);
    await seedQuestions("questions", QUESTIONS);
    await seedCollection("banners", BANNERS);
    await seedCollection("announcements", ANNOUNCEMENTS);
    await seedCollection("upcomingExams", UPCOMING_EXAMS);
    await seedCollection("dailyTips", DAILY_TIPS);
    await seedCollection("previousPapers", PREVIOUS_PAPERS);
    await seedCollection("notes", NOTES);
    await seedCollection("plans", PLANS);
    await seedCollection("navigation", NAVIGATION_ITEMS);

    return NextResponse.json({
      success: true,
      message: "Database seeded successfully with Indian competitive exam data!",
      seeded: results,
      total: Object.values(results).reduce((a: number, b: number) => a + b, 0),
    });
  } catch (error: any) {
    console.error("Seed error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET to check seed status
export async function GET() {
  try {
    const db = await getAdminDb();
    const collections = ["mockTests", "freeTests", "dailyQuiz", "questions", "testSeries", "popularTests", "banners", "announcements", "upcomingExams", "dailyTips", "previousPapers", "notes", "plans", "navigation"];
    const counts: Record<string, number> = {};
    for (const col of collections) {
      const snapshot = await db.collection(col).limit(1).get();
      counts[col] = snapshot.size;
    }
    return NextResponse.json({ status: "ok", collections: counts });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
