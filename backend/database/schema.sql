DROP TABLE IF EXISTS user_permissions CASCADE;
DROP TABLE IF EXISTS level_permissions CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS pages CASCADE;
DROP TABLE IF EXISTS levels CASCADE;

CREATE TABLE levels (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    is_active VARCHAR(10) NOT NULL DEFAULT 'true' CHECK (is_active IN ('true', 'false')),
    deleted_at TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_levels_is_active ON levels(is_active);
CREATE INDEX idx_levels_deleted_at ON levels(deleted_at);

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    level_id INT NOT NULL REFERENCES levels(id) ON DELETE RESTRICT,
    is_active VARCHAR(10) NOT NULL DEFAULT 'true' CHECK (is_active IN ('true', 'false')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_level_id ON users(level_id);
CREATE INDEX idx_users_is_active ON users(is_active);

CREATE TABLE pages (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    path VARCHAR(100) NOT NULL UNIQUE,
    icon VARCHAR(50) DEFAULT 'layers',
    description TEXT,
    sort_order INT NOT NULL DEFAULT 0,
    is_active VARCHAR(10) NOT NULL DEFAULT 'true' CHECK (is_active IN ('true', 'false')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_pages_path ON pages(path);
CREATE INDEX idx_pages_sort_order ON pages(sort_order);
CREATE INDEX idx_pages_is_active ON pages(is_active);

CREATE TABLE level_permissions (
    id SERIAL PRIMARY KEY,
    level_id INT NOT NULL REFERENCES levels(id) ON DELETE CASCADE,
    page_id INT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_level_page UNIQUE (level_id, page_id)
);

CREATE INDEX idx_level_permissions_level_id ON level_permissions(level_id);
CREATE INDEX idx_level_permissions_page_id ON level_permissions(page_id);

CREATE TABLE user_permissions (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    page_id INT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    is_allowed VARCHAR(10) NOT NULL CHECK (is_allowed IN ('true', 'false')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_user_page UNIQUE (user_id, page_id)
);

CREATE INDEX idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX idx_user_permissions_page_id ON user_permissions(page_id);
