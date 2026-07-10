import argon2 from "argon2";

async function main() {
  const hash = await argon2.hash("password123");
  console.log(hash);
}

main();
