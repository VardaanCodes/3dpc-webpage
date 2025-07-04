# 3DPC Print Queue Management Website

---

## 1. Project Overview

### 1.1 Project Title

3DPC Print Queue Management Website - Version 1.0

### 1.2 Project Purpose

This project aims to develop a comprehensive web-based platform for managing 3D printing requests for student clubs and organizations. The system will streamline the submission, approval, and tracking of 3D print jobs while providing transparent queue management and administrative oversight.

### 1.3 Project Scope

The platform will serve as the central hub for all 3D printing activities, handling everything from initial print requests to final delivery notifications. The system will support student authentication, file management, queue visualization, and comprehensive administrative controls.

### 1.4 Success Metrics

- Reduction in manual processing time by 80%
- 100% digital tracking of all print requests
- User satisfaction score above 4.5/5
- Zero lost print requests through digital audit trail
- 95% on-time delivery rate based on calculated estimates

---

## 2. Target Audience \& User Personas

### 2.1 Primary Users

**Students/Club Members**

- College students affiliated with registered clubs
- Need to submit 3D printing requests for club projects and events
- Require visibility into their print status and queue position
- Seek transparent communication about print progress

**Administrators**

- Club volunteers responsible for managing print operations
- Need comprehensive control over print approval and processing
- Require detailed audit trails for accountability
- Manage printer operations and resource allocation

**Super Administrators**

- Senior club leadership with system-wide oversight
- Responsible for policy enforcement and spam prevention
- Manage admin assignments and system configuration
- Access to comprehensive analytics and reporting

---

## 3. Core Features \& Functionality

### 3.1 Authentication \& User Management

**Google OAuth Integration**

- Mandatory login using institutional Google accounts (@college.edu domain)
- Domain restriction to prevent unauthorized access
- Automatic user profile creation with name and email extraction
- Role-based access control (Student, Admin, Super Admin)

**User Roles \& Permissions**

- **Students**: Submit prints, view personal queue, access order history
- **Admins**: Manage all orders, approve/cancel prints, update statuses
- **Super Admins**: System configuration, user suspension, analytics access

### 3.2 Print Order Submission System

**Comprehensive Order Form:**

- Club/Team name selection
  - Auto complete functionality from predefined list. If a particular Club is chosen, other fields are autofilled
  - If not autocomplete, assume new club, and allow manual filling of other details
- Contact person details (auto-filled from login)
- Project/Event name
- Deadline of the event
- File upload (.stl/.gcode formats)
- Material and color preferences(Need to provide Filament if choosing non-default preference)
- Special instructions and notes
- Filament provision checkbox with explanation

**File Management**

- Configurable upload limits (X files per submission, Y files per Z days)
- File retention period configurable by administrators
- X-day(configurable from superadmin dashboard) default access period for student file downloads
- Automatic file deletion with advance warnings in order history

### 3.3 Queue Management \& Status Tracking

**Student Queue Interface**

- Personal print queue visibility only
- Real-time status updates with progress indicators
- Expected delivery time calculation based on prioritization algorithm
- Order history access with detailed summaries
- File download capability within retention period
- Order tracking with unique IDs (format: `\#<ClubCode><AY><PrintNumber>`)
- File limit odometer display next to user avatar showing remaining uploads

**Administrative Queue Dashboard**

- Complete queue visibility with filtering and sorting options
- Batch processing capabilities with dropdown folder organization
- Priority management with visual indicators
- Manual delivery time override functionality
- Comprehensive order details and audit trail access

**Status Types**

- **Submitted**: Initial order placement
- **Approved**: Admin approval with potential batching
- **Cancelled**: Admin cancellation with mandatory reason
- **Started**: Print job initiated with countdown timer
- **Finished**: Successful print completion
- **Failed**: Print failure with improvement suggestions

### 3.4 Notification System

**Email Notifications**

- Order submission confirmation
- Approval/cancellation notifications with reasons
- Print start notifications
- Print completion alerts
- Print failure notifications with improvement suggestions
- Filament request notifications (mandatory)
- Batching notifications (unless disabled)

**Customizable Preferences**

- Individual notification type preferences
- Thread-based email organization
- Mandatory notifications cannot be disabled, Non mandatory emails can be disabled for a student account from his dashboard

### 3.5 Administrative Controls

**Order Management(Admin Panel)**

- Approve/cancel orders with reason documentation
- Print status updates (started, finished, failed)
- Manual print time estimation and countdown initiation
- Filament request functionality
- Batch processing for efficiency optimization

**System Configuration(Superadmin panel)**

- File upload limit management
- File retention period settings
- Notification template customization
- User suspension capabilities (individual and batch)
- Admin assignment automation

### 3.6 Audit \& Analytics

**Comprehensive Audit Trail**

- All administrative actions logged with timestamps
- Admin identification for accountability
- Reason documentation for all status changes
- Exportable logs in CSV and Markdown formats. Admins and superadmins can export, and select which columns to include in the export
- Admin action validation by super administrators
- A seperate Trail for orders placed, with timestamps

**Analytics Dashboard**

- Usage statistics and trends
- Print success rates and failure analysis
- Resource utilization metrics
- Biweekly summary reports to super administrators
- Performance metrics for operational optimization

**Admin Analytics**

- Print success rates and failure analysis
- Resource utilization metrics
- Queue performance statistics
- Admin activity tracking

**Super Admin Reports**

- Comprehensive system usage statistics
- Biweekly automated summary emails (customizable)
- Filament usage tracking and reporting
- User activity and spam detection reports

---

## 4. Technical Architecture

### 4.1 Technology Stack

**Frontend**

- React.js for component-based user interface development
- Responsive design for cross-device compatibility
- Firebase SDK for authentication and real-time updates
- Hard-coded club branding and styling

**Backend**

- Firebase Firestore for scalable NoSQL data storage
- Firebase Cloud Functions for serverless backend logic
- Firebase Authentication for secure user management
- Firebase Hosting for reliable web hosting

**Integration Services**

- Google OAuth API for authentication
- Google Calendar API for deadline visualization
- Email service integration for notification delivery
- Google Sheets integration for backup storage

### 4.2 Database Design

**Collections Structure**

- Users: Profile information, roles, preferences
- Orders: Print requests, status, audit trail
- Batches: Grouped orders for efficient processing
- AuditLogs: Comprehensive action tracking
- SystemConfig: Administrative settings and limits

### 4.3 Security \& Privacy

**Data Protection**

- Domain-restricted authentication
- Role-based access control implementation
- Secure file storage with automatic deletion
- Audit trail integrity with immutable logging
- Student privacy protection (anonymous to other students)

**Spam Prevention**

- Rate limiting on submissions
- Manual admin suspension capabilities
- Automated suspicious activity detection
- Batch suspension functionality for policy violations

---

## 5. User Experience Design

### 5.1 Student User Journey

1. **Authentication**: Secure login via Google OAuth
2. **Dashboard Access**: Personal queue and status overview
3. **Order Submission**: Comprehensive form with file upload
4. **Status Monitoring**: Real-time updates and notifications
5. **History Review**: Past orders and file access

### 5.2 Administrative Workflow

1. **Queue Management**: Review and prioritize incoming requests
2. **Order Processing**: Approve, batch, or request additional information
3. **Print Execution**: Update status and manage printer operations
4. **Communication**: Send notifications and handle queries
5. **Reporting**: Generate analytics and audit reports

### 5.3 Super Admin Operations

1. **System Configuration**: Manage settings and limits
2. **User Management**: Handle suspensions and spam
3. **Admin Oversight**: Validate actions and resolve disputes
4. **Analytics Review**: Monitor system performance and usage
5. **Policy Enforcement**: Maintain operational standards

### 5.4 Interface Design Principles

**Navigation Structure**

- Clear tabbed navigation similar to reference design
- Intuitive dashboard layouts for different user roles
- Mobile-responsive design for accessibility
- Consistent branding and visual hierarchy

**User Feedback Systems**

- Real-time status indicators
- Progress bars for active prints
- Clear error messages and validation feedback
- Success confirmations for all actions

---

## 6. Integration \& Tools

### 6.1 Google Workspace Integration

- Calendar sync for deadline visualization and planning
- Sheets integration for backup data storage and reporting
- Drive integration for file management and sharing capabilities

### 6.2 Third-Party Services

- Email delivery service for reliable notifications
- Analytics platform for usage tracking and insights
- Backup services for data redundancy and recovery

---

## 7. Performance

### 7.1 Performance Requirements

- Page load times under 2 seconds
- Real-time updates with minimal latency
- Concurrent user support for peak usage periods
- Efficient file upload and storage handling

---

## 8. Quality Assurance \& Testing

### 8.1 Testing Strategy

- Unit testing for individual components
- Integration testing for system workflows
- User acceptance testing with actual club members
- Security testing for authentication and authorization
- Performance testing under load conditions

### 8.2 Quality Metrics

- Zero data loss tolerance
- Complete audit trail accuracy
- Email delivery success rate above 95%

---

## 9. Deployment \& Maintenance

### 9.1 Deployment Strategy

- Firebase hosting for reliable web deployment
- Continuous integration/continuous deployment (CI/CD) pipeline
- Staged rollout with beta testing phase
- Rollback procedures for emergency situations

### 9.2 Maintenance Plan

- Regular security updates and patches
- Performance monitoring and optimization
- Data backup verification and recovery testing

---

## 10. Timeline \& Milestones

### 10.1 Key Deliverables

- Working authentication system
- Complete order management workflow
- Administrative control panel
- Comprehensive documentation and user guides

---

## 11. Assumptions \& Constraints

### 11.1 Technical Assumptions

- Reliable internet connectivity for all users
- Google Workspace availability for authentication
- Firebase service reliability and performance
- Email service delivery capabilities

### 11.2 Operational Constraints

- Single printer operation initially
- Manual printer status updates required
- Limited initial admin resources
- Student organization email domain restrictions

### 11.3 Future Considerations

- Mobile application development for next year
- Multi-printer support expansion

---

## 12. Success Criteria \& Metrics

### 12.1 Launch Success Metrics

- 100% of current print requests processed through new system
- User onboarding completion rate above 90%
- System availability above 99%
- Zero security incidents during launch period

### 12.2 Long-term Success Indicators

- Increased print request volume handling
- Reduced administrative overhead
- Improved user satisfaction scores
- Enhanced operational transparency and accountability

---

## 13. Appendices

### 13.1 Glossary of Terms

- **PRD**: Product Requirements Document
- **3DPC**: 3D Printing Club
- **OAuth**: Open Authorization standard
- **Firebase**: Google's mobile and web development platform
- **SOP**: Standard Operating Procedure

### 13.2 Reference Materials

- Firebase documentation and best practices
- Google OAuth implementation guides
- 3D printing industry standards and workflows
- Product requirements document templates and examples

---

**Document Version**: 1.0
**Last Updated**: June 19, 2025
**Next Review Date**: July 19, 2025
**Document Owner**: 3DPC Development Team
