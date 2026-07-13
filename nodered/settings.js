module.exports = {
  flowFile: "flows.json",
  flowFilePretty: true,
  adminAuth: {
    type: "credentials",
    users: [
      {
        username: "admin",
        password: "$2a$08$zZWtXTna0VmKKU8NCX8XuejF8q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q",
        permissions: "*",
      },
    ],
  },
  logging: {
    console: {
      level: "info",
      metrics: false,
      audit: false,
    },
  },
};
