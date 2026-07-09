export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN_PASTOR = 'admin_pastor',
  DEPARTMENT_HEAD = 'department_head',
  CELL_LEADER = 'cell_leader',
  FOLLOW_UP_WORKER = 'follow_up_worker',
  USHER = 'usher',
  FINANCE_OFFICER = 'finance_officer',
  MEMBER = 'member',
}

export enum MemberStatus {
  VISITOR = 'visitor',
  FIRST_TIMER = 'first_timer',
  NEW_CONVERT = 'new_convert',
  MEMBER = 'member',
  WORKER = 'worker',
  MINISTER = 'minister',
  BACKSLIDDEN = 'backslidden',
  TRANSFERRED = 'transferred',
  DECEASED = 'deceased',
}

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
}

export enum MaritalStatus {
  SINGLE = 'single',
  MARRIED = 'married',
  DIVORCED = 'divorced',
  WIDOWED = 'widowed',
}

export enum BaptismStatus {
  NONE = 'none',
  WATER = 'water',
  HOLY_SPIRIT = 'holy_spirit',
  BOTH = 'both',
}

export enum SubscriptionPlan {
  STARTER = 'starter',
  GROWTH = 'growth',
  PARISH = 'parish',
  MULTI_BRANCH = 'multi_branch',
  ENTERPRISE = 'enterprise',
}

export enum SubscriptionStatus {
  TRIAL = 'trial',
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}
