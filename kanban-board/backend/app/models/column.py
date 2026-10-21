from sqlalchemy import UniqueConstraint
from sqlmodel import Field, SQLModel

DEFAULT_COLUMN_NAMES = ("To Do", "In Progress", "Review", "Done")


class Column(SQLModel, table=True):
    __tablename__ = "board_column"
    __table_args__ = (UniqueConstraint("board_id", "position"),)

    id: int | None = Field(default=None, primary_key=True)
    board_id: int = Field(foreign_key="board.id", index=True)
    name: str
    position: int
