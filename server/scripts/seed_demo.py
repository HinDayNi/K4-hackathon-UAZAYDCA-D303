from app.core.database import get_connection, initialize_database


def main() -> None:
    initialize_database()
    with get_connection() as connection:
        connection.execute(
            """
            INSERT OR IGNORE INTO lessons(id, title, description)
            VALUES (?, ?, ?)
            """,
            ("demo-01", "Nhập môn AI", "Bài học mẫu để kiểm tra API."),
        )
        connection.execute(
            """
            INSERT OR IGNORE INTO lesson_segments(id, lesson_id, position, content)
            VALUES (?, ?, ?, ?)
            """,
            (
                "T00-001",
                "demo-01",
                1,
                "Đây là đoạn mẫu. Dữ liệu thật sẽ được index từ transcript cục bộ.",
            ),
        )
    print("Đã tạo dữ liệu demo.")


if __name__ == "__main__":
    main()
