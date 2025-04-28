# QUẢN LÝ KÍ TÚC XÁ  

![image](https://github.com/user-attachments/assets/2e859f90-ee19-4df4-894d-689ccc63efd6)  

**QUẢN LÝ KÍ TÚC XÁ** is a data management platform for residents based on their educational levels, with features for issue reporting, daily task scheduling, and a statistical dashboard. This project is designed to streamline management for residents, staff, and parents through a user-friendly interface.  

## 📋 Key Features  
1. **Resident Data Management**  
   - Manage resident data by educational level (Kindergarten, Elementary, Middle School, High School, University, Internship).  
   - Store alumni history (university or internship records).  
![image](https://github.com/user-attachments/assets/2ce02ce0-3a32-4cd7-834e-b92211bd3f8f)  

2. **Issue Reporting**  
   - Resident issue reporting form.  
   - Track issue history per individual.  
![image](https://github.com/user-attachments/assets/7cf8d579-ea4a-40e4-9c2f-54625295468e)  

3. **Task Scheduling**  
   - Daily duty scheduling for residents.  
   - Assign tasks for social service activities.  
![image](https://github.com/user-attachments/assets/fee6fc34-2f34-449c-8ed0-b57d4c62806f)  

4. **Role-Based Access**  
   - **Admin:** Full access to view, add, or update data.  
   - **Staff:** Limited access to view resident data and assignments.  
   - **Parents:** Restricted access to view relevant data (e.g., child’s information and schedule).  
![image](https://github.com/user-attachments/assets/11de39d9-847f-4931-a825-e04210c5e1a4)  

5. **Dashboard and Visualization**  
   - Display statistics based on educational levels and resident status.  
   - Data visualizations such as charts for active residents, interns, and alumni.  
![image](https://github.com/user-attachments/assets/058c99fd-572b-46e0-aebe-27b3a4602559)  
![image](https://github.com/user-attachments/assets/3ee2418a-8aba-40e4-a7aa-adcee9142364)  

6. **Security and Authentication**  
   - Role-based login system (Admin, Staff, Parent).  
   - Data protection with encryption and validation.  
![image](https://github.com/user-attachments/assets/abdf0fe7-1eef-4057-a921-ceee92977c0d)  

## 🚀 Technology Stack  
- **Frontend:** HTML, CSS, JavaScript  
- **Backend:** Node.js (Express.js) PENDING  
- **Database:** MySQL PENDING  
- **Authentication:** Passport.js PENDING  
- **Hosting:** Heroku PENDING  

## 🛠 How to Run  
1. Clone this repository:  
   ```bash  
   git clone https://github.com/ebenhaezer19/House-of-Hope-V2.git  
   ```  
2. Install dependencies:  
   ```bash  
   npm install  
   ```  
3. Set up the database with the provided schema.  
4. Run the application:  
   ```bash  
   npm start  
   ```  
5. Access the app at `http://localhost:5173`.  

## 📧 Contact  
For questions or collaboration, reach out to [krisoprasebenhaezer@gmail.com](mailto:krisoprasebenhaezer@gmail.com).  

---

## 🌟 What's Next  

### Backend Development Recommendations  
- **Framework**: Use **Node.js** with **Express.js** or **NestJS** for structured and scalable backend development.  
- **Database**: Switch to **PostgreSQL** for better relational database management.  
- **ORM**: Utilize **Prisma** or **TypeORM** to simplify database operations.  
- **Authentication**: Implement **JWT** for secure token-based authentication.  
- **File Uploads**: Use **Multer** for handling file uploads.  
- **Caching**: Integrate **Redis** for caching to optimize performance.  
- **File Storage**: Utilize **AWS S3** or **Google Cloud Storage** for storing uploaded files.  

### Additional Features to Implement  
1. **Pagination & Filtering**: Efficiently display and filter large datasets.  
2. **Data Export**: Allow exporting data in PDF or Excel formats.  
3. **Image Optimization**: Improve loading speed by optimizing images.  
4. **File Storage Integration**: Enhance file management capabilities with external storage.  
5. **Caching**: Boost application performance by caching frequently accessed data.  
6. **Logging**: Track application behavior and errors with detailed logs.  

### Suggested Backend Structure  
- **Routes**: Organize routes for API endpoints (e.g., `/residents`, `/issues`, `/tasks`).  
- **Controllers**: Handle business logic for each feature.  
- **Models**: Define database schemas and relationships using an ORM like Prisma or TypeORM.  
- **Services**: Implement reusable logic for controllers.  
- **Middleware**: Add authentication, validation, and logging middleware.  
- **Utilities**: Include helper functions for pagination, caching, and file handling.  

---

Feel free to adjust the recommendations based on your project needs! 😊
