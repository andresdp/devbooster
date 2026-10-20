from fastapi import APIRouter

from app.db import SessionDep
from app.errors import ERROR_RESPONSES
from app.schemas import TicketKey, TicketRead, TicketUpdate
from app.services import tickets as ticket_service

router = APIRouter(tags=["tickets"], responses=ERROR_RESPONSES)


@router.get("/tickets/{key}", response_model=TicketRead)
def get_ticket(key: TicketKey, session: SessionDep):
    return TicketRead.from_ticket(ticket_service.get_ticket_or_404(session, key))


@router.patch("/tickets/{key}", response_model=TicketRead)
def update_ticket(key: TicketKey, data: TicketUpdate, session: SessionDep):
    return TicketRead.from_ticket(ticket_service.update_ticket(session, key, data))
