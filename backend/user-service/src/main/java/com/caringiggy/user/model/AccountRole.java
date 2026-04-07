package com.caringiggy.user.model;

public enum AccountRole {
    ADOPTER,
    STAFF,
    ADMIN;

    public boolean isEmployeeRole() {
        return this == STAFF || this == ADMIN;
    }
}
