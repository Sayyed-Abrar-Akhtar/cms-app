import { connectDB } from "../lib/mongodb";
import { User } from "../models/User";

async function seedSuperadmin() {
  const superadminEmail = process.env.SUPERADMIN_EMAIL;

  if (!superadminEmail) {
    console.error("Error: SUPERADMIN_EMAIL environment variable is not set.");
    process.exit(1);
  }

  const cleanEmail = superadminEmail.trim().toLowerCase();

  try {
    await connectDB();

    let user = await User.findOne({ email: cleanEmail });

    if (!user) {
      user = await User.create({
        email: cleanEmail,
        role: "SUPERADMIN",
        organizations: [],
      });
      console.log(`Created new superadmin user: ${cleanEmail}`);
    } else {
      user.role = "SUPERADMIN";
      if (!user.organizations) {
        user.organizations = [];
      }
      await user.save();
      console.log(`Promoted existing user to superadmin: ${cleanEmail}`);
    }

    process.exit(0);
  } catch (error) {
    console.error("Error seeding superadmin:", error);
    process.exit(1);
  }
}

seedSuperadmin();
